import type Stripe from 'stripe'
import { getStripe, getSupabaseAdmin, json } from '../server/kortex.js'

// Reçoit les messages de Stripe et met à jour l'abonnement du client dans Supabase.
// Basé sur la doc Stripe « Receive Stripe events in your webhook endpoint »
// et « Using webhooks with subscriptions ».

// Événements qui peuvent changer l'état d'un abonnement
const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return json({ error: 'Méthode non autorisée.' }, 405)
    }

    const stripe = getStripe()
    const supabase = getSupabaseAdmin()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripe || !supabase || !webhookSecret) {
      console.error('Webhook : une variable d’environnement manque.')
      return json({ error: 'Webhook non configuré.' }, 500)
    }

    // On vérifie que le message vient bien de Stripe, avec le texte brut reçu
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        await request.text(),
        request.headers.get('stripe-signature') ?? '',
        webhookSecret,
      )
    } catch (error) {
      console.error('Webhook : signature invalide.', error)
      return json({ error: 'Signature invalide.' }, 400)
    }

    let subscriptionId: string | null = null
    if (event.type === 'checkout.session.completed') {
      const subscription = event.data.object.subscription
      subscriptionId = typeof subscription === 'string' ? subscription : (subscription?.id ?? null)
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      subscriptionId = (event.data.object as Stripe.Subscription).id
    }
    if (!subscriptionId) return json({ received: true })

    // Stripe n'envoie pas les messages dans l'ordre : on relit l'abonnement à jour
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const userId = subscription.metadata.supabase_user_id
    if (!userId) {
      console.error('Webhook : abonnement sans compte Kortex', subscription.id)
      return json({ received: true })
    }

    let update = supabase
      .from('profiles')
      .update({
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
      })
      .eq('id', userId)
    // Un ancien abonnement terminé ne doit pas écraser un nouvel abonnement actif
    if (subscription.status !== 'active') {
      update = update.or(`stripe_subscription_id.is.null,stripe_subscription_id.eq.${subscription.id}`)
    }
    const { error } = await update
    if (error) {
      // Réponse en erreur : Stripe renverra le message plus tard
      console.error('Webhook : mise à jour Supabase impossible.', error.message)
      return json({ error: 'Mise à jour impossible.' }, 500)
    }

    return json({ received: true })
  },
}

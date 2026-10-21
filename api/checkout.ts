import { getCustomer, getStripe, json, PRICE_LOOKUP_KEY } from '../server/kortex.js'

// Ouvre la page de paiement Stripe pour l'abonnement Kortex.
// Basé sur la doc Stripe « Build a subscriptions integration » (Checkout hébergé par Stripe).

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return json({ error: 'Méthode non autorisée.' }, 405)
    }

    const stripe = getStripe()
    if (!stripe) {
      return json({ error: 'Le paiement n’est pas encore configuré.' }, 500)
    }

    const customer = await getCustomer(request)
    if (!customer) {
      return json({ error: 'Connecte-toi pour t’abonner.' }, 401)
    }
    if (customer.profile.subscription_status === 'active') {
      return json({ error: 'Ton abonnement est déjà actif.' }, 409)
    }

    try {
      // Le prix est retrouvé par son nom fixe, comme dans le guide Stripe
      const prices = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true })
      const price = prices.data[0]
      if (!price) throw new Error(`Aucun prix actif avec la clé ${PRICE_LOOKUP_KEY}`)

      const origin = new URL(request.url).origin
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: price.id, quantity: 1 }],
        // Relie le paiement au compte Kortex du client
        client_reference_id: customer.user.id,
        subscription_data: { metadata: { supabase_user_id: customer.user.id } },
        // Un ancien client garde sa fiche Stripe, un nouveau client a son email prérempli
        ...(customer.profile.stripe_customer_id
          ? { customer: customer.profile.stripe_customer_id }
          : { customer_email: customer.user.email }),
        locale: 'fr',
        success_url: `${origin}/abonnement?paiement=ok`,
        cancel_url: `${origin}/abonnement`,
      })
      return json({ url: session.url })
    } catch (error) {
      console.error('Erreur Stripe Checkout :', error)
      return json({ error: 'Le paiement ne répond pas. Réessaie dans un instant.' }, 502)
    }
  },
}

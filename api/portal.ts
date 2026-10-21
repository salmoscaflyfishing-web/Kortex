import { getCustomer, getStripe, json } from '../server/kortex.js'

// Ouvre l'espace Stripe où le client gère son abonnement (carte, factures, résiliation).
// Basé sur la doc Stripe « Customer portal ».

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
      return json({ error: 'Connecte-toi pour gérer ton abonnement.' }, 401)
    }
    if (!customer.profile.stripe_customer_id) {
      return json({ error: 'Tu n’as pas encore d’abonnement.' }, 400)
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.profile.stripe_customer_id,
        locale: 'fr',
        return_url: `${new URL(request.url).origin}/app`,
      })
      return json({ url: session.url })
    } catch (error) {
      console.error('Erreur Stripe portail :', error)
      return json({ error: 'L’espace abonnement ne répond pas. Réessaie dans un instant.' }, 502)
    }
  },
}

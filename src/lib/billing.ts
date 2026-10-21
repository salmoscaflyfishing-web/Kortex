import { supabase } from '@/lib/supabase'

// État de l'abonnement du client connecté, lu dans son profil Supabase.
// Le webhook Stripe est le seul à pouvoir le modifier.
export async function getSubscriptionStatus() {
  const { data } = await supabase.from('profiles').select('subscription_status').single()
  return data?.subscription_status ?? null
}

// Demande au serveur une page Stripe (paiement ou espace abonnement), puis l'ouvre.
export async function openStripePage(path: '/api/checkout' | '/api/portal') {
  const { data: auth } = await supabase.auth.getSession()
  const response = await fetch(path, {
    method: 'POST',
    headers: { authorization: `Bearer ${auth.session?.access_token ?? ''}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.url) throw new Error(data.error ?? 'Une erreur est survenue.')
  window.location.assign(data.url)
}

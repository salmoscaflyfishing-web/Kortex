import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Outils communs aux fonctions du dossier api/. Ce code tourne uniquement sur le serveur.

// Nom fixe du prix Kortex dans Stripe (champ « Clé de recherche » du tarif)
export const PRICE_LOOKUP_KEY = 'kortex_mensuel'

export function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

// Client Stripe avec la clé secrète (doc Stripe : README du paquet stripe pour Node)
export function getStripe() {
  const apiKey = process.env.STRIPE_API_KEY
  return apiKey ? new Stripe(apiKey) : null
}

// Client Supabase « au nom du client » : il ne voit que sa propre ligne (RLS).
// Renvoie aussi le compte du client, vérifié par Supabase.
export async function getCustomer(request: Request) {
  const authorization = request.headers.get('authorization')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey || !authorization?.startsWith('Bearer ')) return null

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await supabase.auth.getUser(authorization.slice('Bearer '.length))
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_status')
    .single()
  if (!profile) return null

  return { user: data.user, profile }
}

// Client Supabase avec la clé secrète : il passe outre la RLS.
// Réservé au webhook Stripe (doc Supabase : « Use a secret key in backend code »).
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) return null
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false } })
}

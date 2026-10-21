import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
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

// Email de bienvenue, envoyé une seule fois quand l'abonnement devient actif.
// Doc Resend : « Send emails with Node.js » et « Idempotency Keys ».
export async function sendWelcomeEmail(to: string, subscriptionId: string, appUrl: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY manque.' }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send(
    {
      from: 'Klarnet <no-reply@mail.klarnet.fr>',
      to: [to],
      subject: 'Bienvenue sur Klarnet, ton abonnement est actif',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 16px">Bienvenue sur Klarnet</h1>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px">
    Ton abonnement est actif. Tu as 100 recherches par mois : pose ta question, Klarnet te répond avec un texte clair, sans pub, et ses sources.
  </p>
  <p style="margin:0 0 24px">
    <a href="${appUrl}" style="display:inline-block;background:#1447e6;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">
      Faire ma première recherche
    </a>
  </p>
  <p style="font-size:14px;line-height:1.5;color:#555;margin:0">
    Ton reçu de paiement t'est envoyé à part par Stripe. Tu peux gérer ou résilier ton abonnement à tout moment avec le bouton « Mon abonnement ».
  </p>
</div>`,
      text: `Bienvenue sur Klarnet

Ton abonnement est actif. Tu as 100 recherches par mois : pose ta question, Klarnet te répond avec un texte clair, sans pub, et ses sources.

Faire ma première recherche : ${appUrl}

Ton reçu de paiement t'est envoyé à part par Stripe. Tu peux gérer ou résilier ton abonnement à tout moment avec le bouton « Mon abonnement ».`,
    },
    // Resend garde cette clé 24 h : si Stripe renvoie le même événement, pas de doublon
    { idempotencyKey: `welcome/${subscriptionId}` },
  )
  return { error: error?.message ?? null }
}

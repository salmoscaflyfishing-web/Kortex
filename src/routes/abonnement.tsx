import { useEffect, useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getSubscriptionStatus, openStripePage } from '@/lib/billing'
import { supabase } from '@/lib/supabase'

const included = [
  '100 recherches par mois',
  'Des réponses sans pub ni lien sponsorisé',
  'Les sources citées à chaque réponse',
  'Sans engagement, résiliable à tout moment',
]

// Temps d'attente maximum du message de Stripe après le paiement
const ACTIVATION_TIMEOUT_MS = 30_000

export const Route = createFileRoute('/abonnement')({
  // ?paiement=ok : retour de la page de paiement Stripe
  validateSearch: (search: Record<string, unknown>): { paiement?: 'ok' } =>
    search.paiement === 'ok' ? { paiement: 'ok' } : {},
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/connexion' })
    if (!search.paiement && (await getSubscriptionStatus()) === 'active') throw redirect({ to: '/app' })
  },
  component: AbonnementPage,
})

function AbonnementPage() {
  const navigate = useNavigate()
  const { paiement } = Route.useSearch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [waiting, setWaiting] = useState(paiement === 'ok')

  // Après le paiement, on attend que le webhook Stripe active l'abonnement
  useEffect(() => {
    if (!waiting) return
    const started = Date.now()
    const timer = setInterval(async () => {
      if ((await getSubscriptionStatus()) === 'active') {
        clearInterval(timer)
        navigate({ to: '/app' })
      } else if (Date.now() - started > ACTIVATION_TIMEOUT_MS) {
        clearInterval(timer)
        setWaiting(false)
        setError('Ton paiement est bien reçu, mais l’activation prend du retard. Recharge la page dans une minute.')
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [waiting, navigate])

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      await openStripePage('/api/checkout')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Klarnet
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16">
        {waiting ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center" role="status">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-lg font-semibold">Paiement reçu, merci !</p>
              <p className="text-muted-foreground">On active ton abonnement. Ça prend quelques secondes.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="ring-2 ring-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Dernière étape : ton abonnement</CardTitle>
              <CardDescription>Ton compte est prêt. Abonne-toi pour lancer tes recherches.</CardDescription>
              <p className="mt-2">
                <span className="text-4xl font-semibold tracking-tight">7,99 €</span>
                <span className="text-muted-foreground"> par mois</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {error && (
                <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button size="lg" className="h-12 w-full text-base" onClick={handleSubscribe} disabled={loading}>
                {loading && <Loader2 className="animate-spin" aria-hidden />}
                M’abonner – 7,99 € par mois
              </Button>
              <p className="text-center text-sm text-muted-foreground">Paiement sécurisé par Stripe.</p>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  )
}

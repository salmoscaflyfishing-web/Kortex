import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { CreditCard, ExternalLink, Loader2, LogOut, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/lib/auth'
import { getSubscriptionStatus, openStripePage } from '@/lib/billing'
import { supabase } from '@/lib/supabase'

const MONTHLY_SEARCHES = 100

export const Route = createFileRoute('/app')({
  // Page réservée aux abonnés actifs (doc officielle TanStack Router : authenticated routes)
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/connexion' })
    if ((await getSubscriptionStatus()) !== 'active') throw redirect({ to: '/abonnement' })
  },
  component: AppPage,
})

// Mois en cours à Paris, au format AAAA-MM, comme le compteur dans Supabase
function currentParisMonth() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(new Date())
}

type SearchResult = {
  headline: string
  points: string[]
  sources: { title: string; url: string }[]
  searchSuggestions?: string
  remaining: number
}

function AppPage() {
  const navigate = useNavigate()
  const session = useSession()
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  // Recherches restantes ce mois-ci, lues dans le profil du client
  useEffect(() => {
    supabase
      .from('profiles')
      .select('searches_used, period_start')
      .single()
      .then(({ data }) => {
        if (!data) return
        const sameMonth = data.period_start.startsWith(currentParisMonth())
        setRemaining(sameMonth ? Math.max(0, MONTHLY_SEARCHES - data.searches_used) : MONTHLY_SEARCHES)
      })
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data: auth } = await supabase.auth.getSession()
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${auth.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ question }),
      })
      const data = await response.json()
      if (typeof data.remaining === 'number') setRemaining(data.remaining)
      if (response.status === 401) {
        navigate({ to: '/connexion' })
        return
      }
      if (response.status === 402) {
        navigate({ to: '/abonnement' })
        return
      }
      if (!response.ok) throw new Error(data.error ?? 'Une erreur est survenue.')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  async function handleManageSubscription() {
    setError('')
    try {
      await openStripePage('/api/portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  async function handleSignOut() {
    // Déconnexion, tirée de la doc officielle Supabase (guides/auth/signout)
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Kortex
          </Link>
          {session && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={handleManageSubscription} aria-label="Mon abonnement">
                <CreditCard aria-hidden />
                <span className="hidden sm:inline">Mon abonnement</span>
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut aria-hidden />
                Se déconnecter
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="question" className="text-lg font-semibold">
            Pose ta question
          </label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Ex. : Comment obtenir un passeport en urgence ?"
            maxLength={300}
            rows={3}
            className="text-base"
          />
          <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-auto" disabled={loading || question.trim().length < 3}>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
            {loading ? 'Kortex cherche…' : 'Chercher'}
          </Button>
          {remaining !== null && (
            <p className="text-sm text-muted-foreground">
              {remaining} recherche{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} ce mois-ci
            </p>
          )}
        </form>

        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            {error}
          </p>
        )}

        {result && (
          <Card className="mt-8">
            <CardContent className="space-y-5">
              <p className="text-xl leading-snug font-semibold text-pretty sm:text-2xl">{result.headline}</p>
              {result.points.length > 0 && (
                <ul className="space-y-2">
                  {result.points.map((point) => (
                    <li key={point} className="flex gap-3 text-base">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
              {result.sources.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Sources</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {result.sources.map((source) => (
                      <li key={source.url} className="max-w-full">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:border-primary hover:text-primary"
                        >
                          <span className="truncate">{source.title}</span>
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.searchSuggestions && (
                <div
                  className="max-w-full overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: result.searchSuggestions }}
                />
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

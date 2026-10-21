import { useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Loader2, LogOut, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/app')({
  component: AppPage,
})

type SearchResult = {
  headline: string
  points: string[]
  sources: { title: string; url: string }[]
  searchSuggestions?: string
}

function AppPage() {
  const navigate = useNavigate()
  const session = useSession()
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Une erreur est survenue.')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
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
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut aria-hidden />
              Se déconnecter
            </Button>
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

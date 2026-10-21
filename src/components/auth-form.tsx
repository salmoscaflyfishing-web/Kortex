import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authErrorMessage } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const MIN_PASSWORD_LENGTH = 8

// Formulaire commun aux pages /inscription et /connexion.
export function AuthForm({ mode }: { mode: 'inscription' | 'connexion' }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const isSignup = mode === 'inscription'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    // Appels tirés de la doc officielle Supabase (guides/auth/passwords)
    const { data, error } = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(authErrorMessage(error))
    } else if (data.session) {
      navigate({ to: '/app' })
    } else {
      // Inscription réussie, mais Supabase attend la confirmation de l'email
      setCheckEmail(true)
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

      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10 sm:py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{isSignup ? 'Créer ton compte' : 'Te connecter'}</CardTitle>
            <CardDescription>
              {isSignup ? 'Ton email et un mot de passe suffisent.' : 'Content de te revoir.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkEmail ? (
              <p role="status" className="rounded-lg border bg-muted/50 p-4">
                Presque fini ! Ouvre l’email envoyé à <strong className="break-all">{email}</strong> et clique sur
                le lien pour confirmer ton compte.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                  {isSignup && (
                    <p className="text-sm text-muted-foreground">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>
                  )}
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" aria-hidden />}
                  {isSignup ? 'Créer mon compte' : 'Me connecter'}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <Link
                to={isSignup ? '/connexion' : '/inscription'}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {isSignup ? 'Te connecter' : 'Créer un compte'}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

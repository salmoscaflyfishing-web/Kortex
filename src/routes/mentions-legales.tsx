import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/mentions-legales')({
  component: MentionsLegalesPage,
})

function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour à l’accueil
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Mentions légales</h1>
      <p className="mt-4 text-muted-foreground">
        Cette page sera complétée avant la mise en ligne.
      </p>
    </main>
  )
}

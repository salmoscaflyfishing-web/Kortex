import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, FileText, Filter, MessageCircle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const steps = [
  {
    icon: MessageCircle,
    title: 'Tu poses ta question.',
    text: 'En français, comme tu la dirais à un ami.',
  },
  {
    icon: Filter,
    title: 'Kortex fait le tri.',
    text: 'Il cherche sur le web et met de côté la pub et les pages sponsorisées.',
  },
  {
    icon: FileText,
    title: 'Tu lis un texte clair.',
    text: 'Une réponse courte et simple, avec les liens de ses sources.',
  },
]

const included = [
  '100 recherches par mois',
  'Des réponses sans pub ni lien sponsorisé',
  'Les sources citées à chaque réponse',
  'Tes recherches ne sont jamais revendues',
  'Sans engagement, résiliable à tout moment',
]

const faq = [
  {
    q: 'Kortex, c’est quoi ?',
    a: 'Un moteur de recherche qui te répond par un texte clair au lieu d’une liste de liens remplie de pub.',
  },
  {
    q: 'Pourquoi c’est payant ?',
    a: 'Un moteur gratuit gagne son argent avec la pub. Avec Kortex, c’est ton abonnement qui paie le service : on n’a donc aucune raison de te montrer de la pub.',
  },
  {
    q: 'Mes recherches restent-elles privées ?',
    a: 'On ne vend pas tes recherches et on ne s’en sert pas pour de la pub. Elles servent seulement à écrire ta réponse.',
  },
  {
    q: 'Je peux arrêter quand je veux ?',
    a: 'Oui. Il n’y a pas d’engagement : tu résilies quand tu veux depuis ton espace client.',
  },
]

function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Kortex
          </Link>
          <Button asChild>
            <a href="#prix">Commencer</a>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Pose ta question. Reçois un texte clair,{' '}
            <span className="text-primary">sans pub.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            Kortex est un moteur de recherche privé, pensé pour la France. Il
            lit les pages à ta place, écarte la pub et les résultats
            sponsorisés, et te donne une réponse simple, avec ses sources.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 w-full px-6 text-base sm:w-auto">
            <a href="#prix">Commencer – 7,99 € par mois</a>
          </Button>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Comment ça marche
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <step.icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle className="mt-2">
                        {i + 1}. {step.title}
                      </CardTitle>
                      <CardDescription>{step.text}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="prix" className="scroll-mt-14 border-t">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Un seul prix, tout compris
            </h2>
            <Card className="mx-auto mt-10 max-w-md ring-2 ring-primary">
              <CardHeader>
                <CardTitle className="text-xl">Kortex</CardTitle>
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
              </CardContent>
              <CardFooter>
                <Button size="lg" className="h-12 w-full text-base">
                  Commencer
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="mt-10">
              {faq.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="py-4 text-base">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© 2026 Kortex</p>
          <nav className="flex gap-6">
            <Link to="/mentions-legales" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link to="/remboursement" className="hover:text-foreground">
              Conditions de remboursement
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

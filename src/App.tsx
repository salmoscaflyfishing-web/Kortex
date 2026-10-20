import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Kortex</h1>
      <p className="max-w-sm text-muted-foreground">
        Le projet est prêt : Vite, React, TypeScript, Tailwind, TanStack
        Router et shadcn/ui fonctionnent.
      </p>
      <Button size="lg">Commencer</Button>
    </main>
  )
}

export default App

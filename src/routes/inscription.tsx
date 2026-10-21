import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth-form'

export const Route = createFileRoute('/inscription')({
  component: InscriptionPage,
})

function InscriptionPage() {
  return <AuthForm mode="inscription" />
}

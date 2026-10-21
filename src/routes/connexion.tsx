import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth-form'

export const Route = createFileRoute('/connexion')({
  component: ConnexionPage,
})

function ConnexionPage() {
  return <AuthForm mode="connexion" />
}

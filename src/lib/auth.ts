import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Renvoie la session du client : undefined pendant le chargement, null s'il n'est pas connecté.
// Basé sur la doc officielle Supabase (onAuthStateChange).
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  return session
}

// Traduit en français les erreurs Supabase les plus courantes.
export function authErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return 'Confirme d’abord ton email avec le lien reçu dans ta boîte mail.'
    case 'user_already_exists':
      return 'Un compte existe déjà avec cet email. Connecte-toi.'
    case 'weak_password':
      return 'Mot de passe trop faible. Choisis-en un plus long.'
    case 'email_address_invalid':
      return 'Cette adresse email n’est pas valide.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Trop d’essais. Réessaie dans quelques minutes.'
    default:
      return 'Une erreur est survenue. Réessaie dans un instant.'
  }
}

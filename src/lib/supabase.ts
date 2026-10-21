import { createClient } from "@supabase/supabase-js"

// Code tiré de la doc officielle Supabase (quickstart React, étape 7).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manque. Ajoute-les dans .env.local ou dans les variables d'environnement."
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

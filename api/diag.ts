// Diagnostic TEMPORAIRE : liste les NOMS des variables reçues par le serveur, jamais leurs valeurs.
// À supprimer dès que le problème des variables Vercel est compris.

const EXPECTED = [
  'GEMINI_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'STRIPE_API_KEY',
  'RESEND_API_KEY',
]

export default {
  async fetch() {
    const names = Object.keys(process.env)
    const expected = Object.fromEntries(
      EXPECTED.map((name) => [
        name,
        {
          present: Boolean(process.env[name]),
          // Nom proche (espace, minuscules…) : on le montre entre crochets pour voir les espaces
          lookalikes: names
            .filter((n) => n !== name && n.trim().toUpperCase() === name)
            .map((n) => `[${n}]`),
        },
      ])
    )
    return Response.json({
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      count: names.length,
      expected,
      names: names.filter((n) => /^[A-Za-z0-9_]+$/.test(n)).sort(),
      oddNames: names.filter((n) => !/^[A-Za-z0-9_]+$/.test(n)).length,
    })
  },
}

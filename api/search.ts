import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

// Le moteur Kortex : il tourne uniquement sur le serveur.
// La clé GEMINI_API_KEY n'est jamais envoyée au navigateur.

const MODEL = 'gemini-3.5-flash-lite'
const MAX_QUESTION_LENGTH = 300
const MONTHLY_SEARCHES = 100
const LIMIT_MESSAGE = 'Tu as utilisé tes 100 recherches ce mois-ci. Le compteur repart à zéro le 1er du mois.'

const SYSTEM_INSTRUCTION = `Tu es Klarnet, un moteur de recherche pour le public français.
Réponds toujours en français simple, comme à un ami, avec des phrases courtes.

Format strict, en texte brut, sans markdown ni gras :
- Ligne 1 : la réponse essentielle, en une seule phrase.
- Ensuite, 2 à 4 lignes qui commencent par "- ", chacune avec un fait utile.
120 mots au maximum.

Cherche avec Google Search. Ignore les publicités, les liens sponsorisés, les pages d'affiliation,
les comparateurs commerciaux et les contenus promotionnels. Préfère les sources officielles
(service-public.fr, sites en .gouv.fr), les médias reconnus et les sources neutres.
Ne mets jamais en avant un produit ou une marque pour la promouvoir.
Si tu ne trouves pas d'information fiable, dis-le simplement.`

type SearchResult = {
  headline: string
  points: string[]
  sources: { title: string; url: string }[]
  searchSuggestions?: string
  remaining: number
}

// Mois en cours à Paris, au format AAAA-MM, comme le compteur dans Supabase
function currentParisMonth() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(new Date())
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

function parseAnswer(text: string) {
  const lines = text
    .replace(/\*\*/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const headline = lines.find((line) => !line.startsWith('-')) ?? ''
  const points = lines
    .filter((line) => line !== headline)
    .map((line) => line.replace(/^[-•*]\s*/, ''))
  return { headline, points }
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return json({ error: 'Méthode non autorisée.' }, 405)
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return json({ error: 'Le moteur n’est pas encore configuré.' }, 500)
    }

    const body = (await request.json().catch(() => null)) as { question?: unknown } | null
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    if (question.length < 3 || question.length > MAX_QUESTION_LENGTH) {
      return json({ error: `Ta question doit faire entre 3 et ${MAX_QUESTION_LENGTH} caractères.` }, 400)
    }

    // Le client doit être connecté, abonné, et avoir des recherches restantes ce mois-ci.
    // Client Supabase « au nom du client », comme dans la doc officielle Supabase.
    const authorization = request.headers.get('authorization')
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Les comptes ne sont pas encore configurés.' }, 500)
    }
    if (!authorization?.startsWith('Bearer ')) {
      return json({ error: 'Connecte-toi pour faire une recherche.' }, 401)
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('searches_used, period_start, subscription_status')
      .single()
    if (profileError) {
      console.error('Erreur profil :', profileError.message)
      return json({ error: 'Ta session a expiré. Reconnecte-toi.' }, 401)
    }
    if (profile.subscription_status !== 'active') {
      return json({ error: 'Abonne-toi pour faire des recherches.' }, 402)
    }
    const newMonth = !profile.period_start.startsWith(currentParisMonth())
    if (!newMonth && profile.searches_used >= MONTHLY_SEARCHES) {
      return json({ error: LIMIT_MESSAGE, remaining: 0 }, 429)
    }

    try {
      const ai = new GoogleGenAI({ apiKey })
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: question,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      })

      const metadata = response.candidates?.[0]?.groundingMetadata
      const sources: SearchResult['sources'] = []
      for (const chunk of metadata?.groundingChunks ?? []) {
        const url = chunk.web?.uri
        const title = chunk.web?.title ?? 'Source'
        if (url && !sources.some((s) => s.title === title)) sources.push({ title, url })
      }

      const result: SearchResult = {
        ...parseAnswer(response.text ?? ''),
        sources: sources.slice(0, 5),
        // Google impose d'afficher ces suggestions de recherche avec les résultats
        searchSuggestions: metadata?.searchEntryPoint?.renderedContent,
        remaining: 0,
      }
      if (!result.headline) {
        return json({ error: 'Pas de réponse pour cette question. Essaie de la reformuler.' }, 502)
      }

      // La recherche a réussi : on la décompte seulement maintenant.
      const { data: remaining, error: countError } = await supabase.rpc('consume_search')
      if (countError) throw countError
      if (remaining < 0) return json({ error: LIMIT_MESSAGE, remaining: 0 }, 429)
      result.remaining = remaining
      return json(result)
    } catch (error) {
      console.error('Erreur Gemini :', error)
      return json({ error: 'Le moteur ne répond pas. Réessaie dans un instant.' }, 502)
    }
  },
}

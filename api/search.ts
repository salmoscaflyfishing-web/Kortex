import { GoogleGenAI } from '@google/genai'

// Le moteur Kortex : il tourne uniquement sur le serveur.
// La clé GEMINI_API_KEY n'est jamais envoyée au navigateur.

const MODEL = 'gemini-3.5-flash-lite'
const MAX_QUESTION_LENGTH = 300

const SYSTEM_INSTRUCTION = `Tu es Kortex, un moteur de recherche pour le public français.
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
      }
      if (!result.headline) {
        return json({ error: 'Pas de réponse pour cette question. Essaie de la reformuler.' }, 502)
      }
      return json(result)
    } catch (error) {
      console.error('Erreur Gemini :', error)
      return json({ error: 'Le moteur ne répond pas. Réessaie dans un instant.' }, 502)
    }
  },
}

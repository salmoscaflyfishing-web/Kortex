import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// En local, fait tourner les fonctions du dossier api/ comme Vercel le fera en ligne
function apiDev(): Plugin {
  return {
    name: 'kortex-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const request = new Request('http://localhost/api/search', {
          method: req.method,
          headers: {
            'content-type': req.headers['content-type'] ?? '',
            authorization: req.headers.authorization ?? '',
          },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        })
        const mod = await server.ssrLoadModule('/api/search.ts')
        const response: Response = await mod.default.fetch(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les clés secrètes de .env.local pour le serveur uniquement (jamais pour le navigateur)
  const env = loadEnv(mode, process.cwd(), '')
  for (const name of ['GEMINI_API_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
    if (env[name]) process.env[name] = env[name]
  }

  return {
    plugins: [
      // Le plugin TanStack Router doit passer avant le plugin React
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
      apiDev(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})

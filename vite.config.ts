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
      server.middlewares.use('/api', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!['search', 'checkout', 'portal', 'webhook'].includes(name)) {
          res.statusCode = 404
          res.end()
          return
        }
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === 'string') headers.set(key, value)
        }
        const request = new Request(`http://${req.headers.host}/api/${name}`, {
          method: req.method,
          headers,
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        })
        const mod = await server.ssrLoadModule(`/api/${name}.ts`)
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
  for (const name of [
    'GEMINI_API_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'STRIPE_API_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]) {
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

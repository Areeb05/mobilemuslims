import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config({ path: '.env' })

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPublicAppOrigin } from './lib/public-url.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: getPublicAppOrigin(),
    methods: ['GET', 'POST']
  }
})

// Middleware — allow browser fetches to Hugging Face Hub / LFS for offline Transformers.js models
const cspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives()
// getDefaultDirectives() uses kebab-case "script-src"; omit it from spread so we do not duplicate scriptSrc (Helmet dashifies camelCase to the same directive).
const { 'script-src': defaultScriptSrc, ...cspRest } = cspDefaults
const cspDirectives = {
  ...cspRest,
  connectSrc: [
    "'self'",
    'https://huggingface.co',
    'https://cdn-lfs.huggingface.co',
    'https://*.xethub.hf.co',
    'https://cdn.jsdelivr.net',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ],
  // ORT / WebAssembly + AudioWorklet (offline Understand Salah on Safari/WebKit)
  scriptSrc: [...(defaultScriptSrc ?? ["'self'"]), "'wasm-unsafe-eval'"],
  workerSrc: ["'self'", 'blob:'],
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  }),
)
app.use(cors())

// Stripe webhooks need raw body for signature verification
// Must be before express.json() middleware
app.use('/api/painfreesalah/webhook', express.raw({ type: 'application/json' }))
app.use('/api/donations/webhook', express.raw({ type: 'application/json' }))

// JSON parsing for all other routes
app.use(express.json())

// API Routes (register before SPA fallback in production so /api/* is not swallowed)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Donation routes
import donationRoutes from './routes/donations.js'
app.use('/api/donations', donationRoutes)

// Pain Free Salah routes
import painfreesalahRoutes from './routes/painfreesalah.js'
app.use('/api/painfreesalah', painfreesalahRoutes)

// AI Trainer routes
import aiTrainerRoutes from './routes/ai-trainer.js'
app.use('/api/ai-trainer', aiTrainerRoutes)

// Import and setup WebSocket handlers
import { setupSocketHandlers } from './routes/stream.js'
setupSocketHandlers(io)

// Serve static files from client build (for production) — after API routes
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist')
  const indexHtmlPath = path.join(clientDistPath, 'index.html')
  let patchedIndexHtml: string | null = null
  const getPatchedIndexHtml = (): string => {
    if (!patchedIndexHtml) {
      const raw = fs.readFileSync(indexHtmlPath, 'utf8')
      const origin = JSON.stringify(getPublicAppOrigin())
      patchedIndexHtml = raw.replace(
        '<!--__PUBLIC_APP_ORIGIN__-->',
        `<script>window.__PUBLIC_APP_ORIGIN__=${origin};</script>`
      )
    }
    return patchedIndexHtml
  }

  app.use(express.static(clientDistPath, { index: false }))
  app.get('*', (_req, res) => {
    res.type('html').send(getPatchedIndexHtml())
  })
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Public app origin: ${getPublicAppOrigin()}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

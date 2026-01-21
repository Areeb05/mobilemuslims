import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config({ path: '.env' })

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// API Routes (must be registered BEFORE static files and catch-all)
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

// Import and setup WebSocket handlers
import { setupSocketHandlers } from './routes/stream.js'
setupSocketHandlers(io)

// Serve static files from client build (for production)
// This must come AFTER API routes
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDistPath))
  
  // SPA catch-all - must be LAST
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`)
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

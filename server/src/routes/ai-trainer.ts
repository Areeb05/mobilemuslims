import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { generateEmbedding, chatWithContext, ChatMessage } from '../lib/openrouter.js'

const router = Router()

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
}

interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
  videoContext?: string
}

// Main chat endpoint with RAG
router.post('/chat', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Database not configured' })
    return
  }

  try {
    const { message, conversationHistory = [], videoContext }: ChatRequest = req.body
    const userId = req.headers['x-user-id'] as string || 'anonymous'

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
      return
    }

    // Generate embedding for the user's query
    let contextDocuments: string[] = []
    
    try {
      const queryEmbedding = await generateEmbedding(message)

      // Search for relevant documents using pgvector
      const { data: documents, error } = await supabaseAdmin.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3,
      })

      if (!error && documents && documents.length > 0) {
        contextDocuments = documents.map((doc: { title: string; content: string }) => 
          `## ${doc.title}\n${doc.content}`
        )
      }
    } catch (embeddingError) {
      // If embedding fails (e.g., no API key), continue without RAG
      console.warn('Embedding search failed, continuing without context:', embeddingError)
    }

    // Add video context if provided
    if (videoContext) {
      contextDocuments.unshift(`Current video context: ${videoContext}`)
    }

    // Generate response with context
    const response = await chatWithContext(
      message,
      contextDocuments,
      conversationHistory.slice(-10) // Keep last 10 messages for context
    )

    res.json({
      message: response,
      contextUsed: contextDocuments.length > 0,
    })

  } catch (error) {
    console.error('AI Trainer chat error:', error)
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    })
  }
})

// Endpoint to add/update documents (admin only)
interface EmbedRequest {
  title: string
  content: string
  category?: string
  videoId?: string
}

router.post('/embed', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Database not configured' })
    return
  }

  try {
    const { title, content, category, videoId }: EmbedRequest = req.body

    // Basic validation
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' })
      return
    }

    // Generate embedding
    const embedding = await generateEmbedding(`${title}\n\n${content}`)

    // Store in Supabase
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        content,
        embedding,
        category: category || null,
        video_id: videoId || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      document: {
        id: data.id,
        title: data.title,
        category: data.category,
      },
    })

  } catch (error) {
    console.error('Document embedding error:', error)
    res.status(500).json({ 
      error: 'Failed to embed document',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    })
  }
})

// Get all documents (for admin panel)
router.get('/documents', async (_req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Database not configured' })
    return
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, category, video_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.json({ documents: data })

  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// Delete a document (admin only)
router.delete('/documents/:id', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Database not configured' })
    return
  }

  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    res.json({ success: true })

  } catch (error) {
    console.error('Error deleting document:', error)
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

export default router

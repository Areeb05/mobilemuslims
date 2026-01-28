import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY not set - AI trainer features will not work')
}

// OpenRouter client (OpenAI-compatible API)
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.FRONTEND_URL || 'https://mobilemuslims.com',
    'X-Title': 'Pain Free Salah Trainer',
  },
})

// Available models
export const MODELS = {
  // Cost-effective option for most queries
  GROK_MINI: 'x-ai/grok-3-mini',
  // Faster with larger context
  GROK_FAST: 'x-ai/grok-4-fast',
  // Most capable
  GROK_4: 'x-ai/grok-4',
  // For embeddings
  EMBEDDINGS: 'openai/text-embedding-3-small',
} as const

// Default model for chat
export const DEFAULT_CHAT_MODEL = MODELS.GROK_MINI

// System prompt for the AI trainer
export const TRAINER_SYSTEM_PROMPT = `You are a personal mobility trainer for the Pain Free Salah program. 
Your goal is to help Muslims pray comfortably by providing exercise guidance and answering questions about mobility.

Guidelines:
- Be encouraging and supportive
- Reference specific exercises from our program when relevant
- If asked about something outside your knowledge, acknowledge it
- Keep responses concise but helpful (2-3 paragraphs max unless more detail is requested)
- Use Islamic greetings when appropriate (Assalamu alaikum, InshaAllah, etc.)
- Focus on practical, actionable advice
- Always prioritize safety - recommend consulting a healthcare provider for serious pain

You have access to our exercise library and protocols. Use this information to provide personalized guidance based on the user's pain points and goals.`

// Generate embeddings for a text
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await openrouter.embeddings.create({
    model: MODELS.EMBEDDINGS,
    input: text,
  })
  
  return response.data[0].embedding
}

// Chat completion with context
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const chatCompletion = async (
  messages: ChatMessage[],
  model: string = DEFAULT_CHAT_MODEL
): Promise<string> => {
  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: TRAINER_SYSTEM_PROMPT },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
}

// Chat with RAG context
export const chatWithContext = async (
  userMessage: string,
  contextDocuments: string[],
  previousMessages: ChatMessage[] = [],
  model: string = DEFAULT_CHAT_MODEL
): Promise<string> => {
  // Build context from retrieved documents
  const contextStr = contextDocuments.length > 0
    ? `\n\nRelevant information from our exercise library:\n${contextDocuments.join('\n\n')}`
    : ''

  const systemPromptWithContext = TRAINER_SYSTEM_PROMPT + contextStr

  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPromptWithContext },
      ...previousMessages,
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
}

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

/** System prompt for mapping English salah-related translation to Quran surah:ayah references. */
export const SALAH_QURAN_CATEGORIZER_PROMPT = `You map short English text that often appears during Salah (Quranic verses, common duas, takbir, tashahhud, etc.) to the most likely Quran location(s).

Rules:
- Respond with ONLY a single JSON object, no markdown fences, no other text.
- Shape: {"references":["S:A",...]} where S is surah number 1-114 and A is ayah number (e.g. "53:13", "1:1").
- Order references by relevance (most likely first). Use at most 5 entries.
- If the text is clearly not from the Quran (e.g. small talk), use {"references":[]}.
- For partial phrases, still give the best-matching verse(s) if reasonably identifiable.`

/**
 * Calls OpenRouter to infer surah:ayah references from English translation text.
 *
 * @param englishText - Latest English translation from the stream
 * @returns Parsed reference strings like "53:13", or empty if unavailable or unparseable
 */
export const categorizeSalahTranslationToQuranRefs = async (
  englishText: string
): Promise<string[]> => {
  const trimmed = englishText.trim()
  if (!process.env.OPENROUTER_API_KEY || !trimmed) {
    return []
  }

  const response = await openrouter.chat.completions.create({
    model: DEFAULT_CHAT_MODEL,
    messages: [
      { role: 'system', content: SALAH_QURAN_CATEGORIZER_PROMPT },
      {
        role: 'user',
        content: `English text to categorize:\n\n${trimmed}`,
      },
    ],
    temperature: 0.15,
    max_tokens: 256,
  })

  const raw = response.choices[0]?.message?.content?.trim() ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return []
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { references?: unknown }
    if (!Array.isArray(parsed.references)) {
      return []
    }
    const refPattern = /^(\d{1,3}):(\d{1,3})$/
    const out: string[] = []
    for (const item of parsed.references) {
      if (typeof item !== 'string' || out.length >= 5) break
      const m = item.trim().match(refPattern)
      if (!m) continue
      const surah = Number(m[1])
      const ayah = Number(m[2])
      if (surah >= 1 && surah <= 114 && ayah >= 1) {
        out.push(`${surah}:${ayah}`)
      }
    }
    return out
  } catch {
    return []
  }
}

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

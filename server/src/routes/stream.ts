import { SpeechClient } from '@google-cloud/speech'
import { v2 as cloudTranslate } from '@google-cloud/translate'
import type { Server, Socket } from 'socket.io'
import dotenv from 'dotenv'

// Load environment variables for this module
dotenv.config()

/**
 * Client mode setting.
 * Note: Quran mode is now handled entirely client-side.
 * Server only handles Dua mode (general Arabic translation).
 */
type ClientMode = 'quran' | 'dua'

// Safety net: Catch unhandled errors from orphaned gRPC streams
// This prevents server crashes when Google's Speech API times out after client disconnect
process.on('uncaughtException', (err: Error) => {
  // Check if this is a known gRPC timeout error from an orphaned stream
  if (err.message?.includes('408:Request Timeout') || 
      err.message?.includes('Audio Timeout Error')) {
    console.warn('⚠️ Caught orphaned stream timeout (prevented crash):', err.message)
    return // Don't crash - this is expected for orphaned streams
  }
  // Re-throw other errors to maintain normal crash behavior
  console.error('💥 Uncaught exception:', err)
  throw err
})

// Handle Google Cloud credentials
let credentials = {}
try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    console.log('✅ Google Cloud credentials loaded from environment')
  } else {
    console.warn('❌ No Google Cloud credentials found in GOOGLE_CREDENTIALS_JSON')
    console.warn('Running in demo mode without Google Cloud services')
  }
} catch (error) {
  console.error('❌ Failed to parse Google Cloud credentials:', error)
  console.warn('Running in demo mode without Google Cloud services')
}

// Initialize Google Cloud clients
let speechClient: SpeechClient | null = null
let translateClient: cloudTranslate.Translate | null = null

if (Object.keys(credentials).length > 0) {
  try {
    speechClient = new SpeechClient({ credentials })
    translateClient = new cloudTranslate.Translate({ credentials })
    console.log('🎙️ Google Cloud Speech and Translate clients initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud clients:', error)
    speechClient = null
    translateClient = null
  }
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('👤 Client connected:', socket.id)

    let latestTranscription = ''
    let translationInterval: NodeJS.Timeout | null = null
    let recognizeStream: any = null
    let isClientConnected = true
    let streamRecreationTimeout: NodeJS.Timeout | null = null

    // Client mode (Quran mode is handled client-side, server only handles Dua mode)
    let clientMode: ClientMode = 'dua'
    let lastProcessedTranscription = '' // Track to avoid duplicate processing

    // Speech recognition config - reused for stream recreation
    const speechConfig = {
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: 'ar-XA', // Modern Standard Arabic
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        // Metadata for better recognition
        metadata: {
          interactionType: 'DISCUSSION' as const,
          microphoneDistance: 'NEARFIELD' as const,
          originalMediaType: 'AUDIO' as const,
          recordingDeviceType: 'SMARTPHONE' as const,
        },
      },
      interimResults: true,
    }

    // Function to create/recreate the speech recognition stream
    const createRecognizeStream = () => {
      if (!speechClient || !isClientConnected) {
        return
      }

      // Clean up existing stream if any
      if (recognizeStream) {
        recognizeStream.removeAllListeners()
        try {
          recognizeStream.end()
        } catch (e) {
          // Ignore errors when ending old stream
        }
        recognizeStream = null
      }

      console.log('🎙️ Creating speech stream for:', socket.id)

      recognizeStream = speechClient
        .streamingRecognize(speechConfig)
        .on('data', (data: any) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            latestTranscription = data.results[0].alternatives[0].transcript
            socket.emit('transcription', latestTranscription)
          }
        })
        .on('error', (err: any) => {
          console.error('🎙️ Speech-to-Text error:', err.message || err)
          // Don't emit error to client for stream timeout - just recreate
          if (isClientConnected) {
            recreateStream()
          }
        })
        .on('end', () => {
          console.log('🎙️ Speech stream ended for:', socket.id)
          // Automatically recreate stream if client is still connected
          if (isClientConnected) {
            recreateStream()
          }
        })
    }

    // Function to recreate stream with a small delay
    const recreateStream = () => {
      if (!isClientConnected) {
        return
      }

      // Clear any pending recreation
      if (streamRecreationTimeout) {
        clearTimeout(streamRecreationTimeout)
      }

      // Small delay to avoid rapid stream recreation
      streamRecreationTimeout = setTimeout(() => {
        if (isClientConnected) {
          console.log('🔄 Recreating speech stream for:', socket.id)
          createRecognizeStream()
        }
      }, 100)
    }

    if (speechClient) {
      // Initialize speech recognition for this client
      // Note: 'latest_long' and 'useEnhanced' are NOT supported for Arabic (ar-XA)
      createRecognizeStream()

      // Translate every 500ms (only for Dua mode - Quran mode is handled client-side)
      translationInterval = setInterval(async () => {
        // Skip if in Quran mode (handled client-side) or no new transcription
        if (
          clientMode === 'quran' ||
          !latestTranscription ||
          !translateClient ||
          latestTranscription === lastProcessedTranscription
        ) {
          return
        }

        lastProcessedTranscription = latestTranscription

        try {
          // Dua mode: Use Google Translate directly
          const [translation] = await translateClient.translate(
            latestTranscription,
            'en'
          )
          socket.emit('translation', { text: translation, verified: true })
        } catch (err) {
          console.error('🌐 Translation error:', err)
        }
      }, 500)
    } else {
      // Demo mode - simulate transcription
      console.log('🎭 Running in demo mode for client:', socket.id)

      // Simulate some demo transcription
      setTimeout(() => {
        latestTranscription = 'بسم الله الرحمن الرحيم'
        socket.emit('transcription', latestTranscription)
      }, 2000)

      // Mock translation for demo purposes (only for Dua mode)
      translationInterval = setInterval(async () => {
        // Skip if in Quran mode (handled client-side)
        if (clientMode === 'quran' || !latestTranscription || latestTranscription === lastProcessedTranscription) {
          return
        }
        
        lastProcessedTranscription = latestTranscription
        socket.emit('translation', {
          text: latestTranscription + ' (Demo Translation)',
          verified: true,
        })
      }, 1000)
    }

    // Handle audio data from client
    socket.on('audio', (data: any) => {
      if (speechClient && recognizeStream && Buffer.isBuffer(data)) {
        // Check if stream is still writable before writing
        if (!recognizeStream.destroyed && recognizeStream.writable) {
          recognizeStream.write(data)
        }
      } else if (!speechClient) {
        // In demo mode, just acknowledge audio data
        console.log('🎭 Demo mode: Received audio data from client')
      }
    })

    // Handle mode change (Quran/Dua toggle)
    // Note: Quran mode is now handled client-side, server only processes for Dua mode
    socket.on('setMode', (data: { mode: 'quran' | 'dua' }) => {
      if (data.mode === 'quran' || data.mode === 'dua') {
        clientMode = data.mode
        console.log(`🔄 Client ${socket.id} switched to ${data.mode} mode${data.mode === 'quran' ? ' (client-side)' : ' (server-side)'}`)
        // Reset last processed to force re-translation when switching back to dua
        lastProcessedTranscription = ''
      }
    })

    // Handle settings change (kept for compatibility, but server doesn't need edition/showVerseRef anymore)
    socket.on('setSettings', (settings: { mode?: 'quran' | 'dua'; edition?: string; showVerseRef?: boolean }) => {
      if (settings.mode === 'quran' || settings.mode === 'dua') {
        clientMode = settings.mode
      }
      console.log(`⚙️ Client ${socket.id} updated mode:`, clientMode)
      // Reset last processed to force re-translation with new settings
      lastProcessedTranscription = ''
    })

    socket.on('disconnect', () => {
      console.log('👤 Client disconnected:', socket.id)
      
      // Mark client as disconnected to prevent stream recreation
      isClientConnected = false

      // Clear recreation timeout
      if (streamRecreationTimeout) {
        clearTimeout(streamRecreationTimeout)
        streamRecreationTimeout = null
      }

      if (translationInterval) {
        clearInterval(translationInterval)
        translationInterval = null
      }

      if (recognizeStream) {
        // Store reference and null out immediately to prevent any recreation attempts
        const orphanedStream = recognizeStream
        recognizeStream = null
        
        // Remove data and end listeners, but keep/add error handler to prevent crash
        orphanedStream.removeAllListeners('data')
        orphanedStream.removeAllListeners('end')
        
        // Add a no-op error handler to swallow errors from orphaned stream
        // This prevents "unhandled error" crashes when Google's gRPC times out later
        orphanedStream.on('error', (err: any) => {
          console.log('🗑️ Ignored error from orphaned stream:', err.message || err)
        })
        
        // Force destroy instead of graceful end
        try {
          if (typeof orphanedStream.destroy === 'function') {
            orphanedStream.destroy()
          } else {
            orphanedStream.end()
          }
        } catch (e) {
          // Ignore destruction errors
        }
      }
    })
  })

  console.log('📡 Socket.io handlers initialized')
}

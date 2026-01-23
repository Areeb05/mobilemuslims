import { SpeechClient } from '@google-cloud/speech'
import { v2 as cloudTranslate } from '@google-cloud/translate'
import type { Server, Socket } from 'socket.io'
import dotenv from 'dotenv'

// Load environment variables for this module
dotenv.config()

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

    if (speechClient) {
      // Initialize speech recognition for this client
      // Note: 'latest_long' and 'useEnhanced' are NOT supported for Arabic (ar-XA)
      recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: 'LINEAR16' as const,
            sampleRateHertz: 16000,
            languageCode: 'ar-XA', // Modern Standard Arabic
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
            // Metadata for better recognition
            metadata: {
              interactionType: 'DISCUSSION',
              microphoneDistance: 'NEARFIELD',
              originalMediaType: 'AUDIO',
              recordingDeviceType: 'SMARTPHONE',
            },
          },
          interimResults: true,
        })
        .on('data', (data: any) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            latestTranscription = data.results[0].alternatives[0].transcript
            socket.emit('transcription', latestTranscription)
          }
        })
        .on('error', (err: any) => {
          console.error('🎙️ Speech-to-Text error:', err)
          socket.emit('error', 'Transcription error')
        })
        .on('end', () => {
          console.log('🎙️ Speech stream ended for:', socket.id)
        })

      // Translate every 500ms
      translationInterval = setInterval(async () => {
        if (latestTranscription && translateClient) {
          try {
            const [translation] = await translateClient.translate(latestTranscription, 'en')
            socket.emit('translation', translation)
          } catch (err) {
            console.error('🌐 Translation error:', err)
          }
        }
      }, 500)
    } else {
      // Demo mode - simulate transcription
      console.log('🎭 Running in demo mode for client:', socket.id)

      // Simulate some demo transcription
      setTimeout(() => {
        latestTranscription = 'مرحبا بالعالم'
        socket.emit('transcription', latestTranscription)
      }, 2000)

      // Mock translation for demo purposes
      translationInterval = setInterval(() => {
        if (latestTranscription) {
          const mockTranslation = latestTranscription + ' (Demo Translation)'
          socket.emit('translation', mockTranslation)
        }
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

    socket.on('disconnect', () => {
      console.log('👤 Client disconnected:', socket.id)
      if (translationInterval) {
        clearInterval(translationInterval)
        translationInterval = null
      }
      if (recognizeStream) {
        recognizeStream.end()
        recognizeStream = null
      }
    })
  })

  console.log('📡 Socket.io handlers initialized')
}

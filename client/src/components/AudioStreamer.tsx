import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Mic, Square, Volume2, Maximize2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'

interface AudioStreamerProps {
  endpoint?: string
}

export default function AudioStreamer({ endpoint = '/api/stream' }: AudioStreamerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [fullscreenMode, setFullscreenMode] = useState<'arabic' | 'english' | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom when new text arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcription, translation])

  useEffect(() => {
    // Initialize Socket.IO connection
    // In production on Railway, client and server are on same domain, so use relative URL
    // In development, connect to localhost:3001
    const socketUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')
    console.log('Attempting to connect to Socket.IO at:', socketUrl || 'same domain (production)')
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
    })

    // Socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO server at:', socketUrl)
      setError('')
      setConnectionStatus('connected')
    })

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message)
      setError('Connection failed: ' + err.message)
      setConnectionStatus('disconnected')
    })

    socketRef.current.on('transcription', (data: string) => {
      setTranscription(data)
    })

    socketRef.current.on('translation', (data: string) => {
      setTranslation(data)
    })

    socketRef.current.on('error', (err: string) => {
      setError(err)
      setConnectionStatus('disconnected')
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server. Reason:', reason)
      setError('Disconnected from server: ' + reason)
      setConnectionStatus('disconnected')
      stopRecording()
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      stopRecording()
    }
  }, [endpoint])

  const startRecording = async () => {
    try {
      // Enhanced mobile-optimized audio constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 16000, min: 8000 },
          channelCount: { ideal: 1 },
          sampleSize: { ideal: 16 },
          // Additional mobile optimizations
          googEchoCancellation: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googAutoGainControl: { ideal: true },
          googHighpassFilter: { ideal: true },
          googAudioMirroring: { ideal: false },
          // iOS Safari specific
          ...(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
            ? {
                googEchoCancellation2: { ideal: true },
                googNoiseSuppression2: { ideal: true },
              }
            : {}
          )
        } as any // Type assertion for vendor-specific properties
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setIsRecording(true)
      setError('')

      // Use modern AudioWorklet API instead of deprecated ScriptProcessor
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive' // Optimize for real-time processing
      })

      // Resume context if suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Create AudioWorklet for better performance and modern API
      try {
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js')
        processorNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor', {
          parameterData: {
            bufferSize: 2048 // Smaller buffer for lower latency
          }
        })

        // Handle processed audio data from AudioWorklet
        processorNodeRef.current.port.onmessage = (event: MessageEvent) => {
          if (event.data.type === 'audio' && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio', event.data.buffer)
          }
        }

      } catch (workletError) {
        console.warn('AudioWorklet not supported, falling back to ScriptProcessor:', workletError)
        // Fallback to ScriptProcessor for older browsers
        processorNodeRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1)

        processorNodeRef.current.onaudioprocess = (event: AudioProcessingEvent) => {
          const audioData = event.inputBuffer.getChannelData(0)
          const int16Array = new Int16Array(audioData.length)

          // Simple energy-based VAD (Voice Activity Detection)
          let energy = 0
          for (let i = 0; i < audioData.length; i++) {
            energy += audioData[i] * audioData[i]
            int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF
          }
          const rms = Math.sqrt(energy / audioData.length)
          const threshold = 0.01 // Adjust threshold for sensitivity

          // Only send audio if voice activity detected
          if (rms > threshold && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio', int16Array.buffer)
          }
        }
      }

      sourceNodeRef.current.connect(processorNodeRef.current)
      if (processorNodeRef.current instanceof ScriptProcessorNode) {
        processorNodeRef.current.connect(audioContextRef.current.destination)
      }

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording: ' + (err instanceof Error ? err.message : String(err)))
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect()
      processorNodeRef.current = null
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }



  // Fullscreen handlers
  const enterFullscreen = (mode: 'arabic' | 'english') => {
    setFullscreenMode(mode)
    document.body.style.overflow = 'hidden'
  }

  const exitFullscreen = () => {
    setFullscreenMode(null)
    document.body.style.overflow = 'auto'
  }

  // Get current fullscreen content
  const getFullscreenContent = () => {
    if (fullscreenMode === 'arabic') {
      return {
        text: transcription || 'Waiting for speech...',
        className: 'fullscreen-text arabic',
        placeholder: 'Waiting for speech...'
      }
    } else if (fullscreenMode === 'english') {
      return {
        text: translation || 'Translation will appear here...',
        className: 'fullscreen-text english',
        placeholder: 'Translation will appear here...'
      }
    }
    return null
  }

  const fullscreenContent = getFullscreenContent()

  return (
    <>
      {/* Fullscreen Reading Mode */}
      {fullscreenMode && fullscreenContent && (
        <div className="fullscreen-mode">
          <div className="fullscreen-controls">
            <button
              onClick={exitFullscreen}
              className="fullscreen-close"
              aria-label="Exit fullscreen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="fullscreen-content">
            <div className={fullscreenContent.className}>
              {fullscreenContent.text}
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="flex flex-col gap-6 md:gap-8 w-full max-w-4xl mx-auto">
        {/* Connection Status */}
        <div className="flex items-center justify-center">
          <Badge className="text-xs">
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </Badge>
        </div>

        {/* Recording Control */}
        <div className="flex justify-center">
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={`flex flex-col items-center gap-4 px-10 py-8 md:px-12 md:py-10 rounded-3xl font-semibold text-lg md:text-xl transition-all duration-300 touch-manipulation active:scale-95 ${
              connectionStatus !== 'connected' ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105'
            }`}
            disabled={connectionStatus !== 'connected'}
          >
            {isRecording ? (
              <>
                <Square className="h-10 w-10 md:h-12 md:w-12" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="h-10 w-10 md:h-12 md:w-12" />
                <span>Start Recording</span>
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Text Panels */}
        <div className="space-y-6 md:space-y-8">
          {/* Arabic Transcription Panel */}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-10 h-10 md:w-12 md:h-12">
                  <AvatarFallback className="bg-primary/10">
                    <Mic className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl md:text-2xl">Arabic</CardTitle>
              </div>
              <button
                onClick={() => enterFullscreen('arabic')}
                className="p-2 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation ml-auto"
                aria-label="Fullscreen Arabic text"
              >
                <Maximize2 className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground hover:text-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <div
                ref={scrollRef}
                className="h-48 md:h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex items-center justify-center"
              >
                <p className="text-foreground text-xl md:text-2xl leading-relaxed text-center font-arabic whitespace-pre-wrap max-w-full px-4" dir="rtl">
                  {transcription || 'Waiting for speech...'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* English Translation Panel */}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-10 h-10 md:w-12 md:h-12">
                  <AvatarFallback className="bg-primary/10">
                    <Volume2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl md:text-2xl">English</CardTitle>
              </div>
              <button
                onClick={() => enterFullscreen('english')}
                className="p-2 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation ml-auto"
                aria-label="Fullscreen English text"
              >
                <Maximize2 className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground hover:text-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <div
                className="h-48 md:h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex items-center justify-center"
              >
                <p className="text-foreground text-xl md:text-2xl leading-relaxed text-center whitespace-pre-wrap max-w-full px-4">
                  {translation || 'Translation will appear here...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Minimal Instructions */}
        <div className="text-center text-white/60 text-sm">
          <p>Tap the microphone to begin recording</p>
        </div>
      </div>
    </>
  )
}

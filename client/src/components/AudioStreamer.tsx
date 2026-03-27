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
  const [quranReferences, setQuranReferences] = useState<string[]>([])

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const arabicScrollRef = useRef<HTMLDivElement | null>(null)
  const englishScrollRef = useRef<HTMLDivElement | null>(null)
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Auto-scroll Arabic panel to bottom when new transcription arrives
  useEffect(() => {
    if (arabicScrollRef.current) {
      arabicScrollRef.current.scrollTop = arabicScrollRef.current.scrollHeight
    }
  }, [transcription])

  // Auto-scroll English panel to bottom when new translation arrives
  useEffect(() => {
    if (englishScrollRef.current) {
      englishScrollRef.current.scrollTop = englishScrollRef.current.scrollHeight
    }
  }, [translation])

  // Auto-scroll fullscreen mode to bottom when content changes
  useEffect(() => {
    if (fullscreenScrollRef.current && fullscreenMode) {
      fullscreenScrollRef.current.scrollTop = fullscreenScrollRef.current.scrollHeight
    }
  }, [transcription, translation, fullscreenMode])

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

    socketRef.current.on('quranReferences', (payload: { references?: string[] }) => {
      const refs = Array.isArray(payload?.references) ? payload.references : []
      setQuranReferences(refs)
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
      // Request screen wake lock to keep screen on during prayer
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('Screen wake lock acquired')
        } catch (wakeLockErr) {
          console.warn('Wake lock not available:', wakeLockErr)
        }
      }

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
      setQuranReferences([])
      if (socketRef.current?.connected) {
        socketRef.current.emit('recordingSessionStart')
      }

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

    // Release screen wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
      console.log('Screen wake lock released')
    }

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
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-white/60 text-sm">
              {fullscreenMode === 'arabic' ? 'Arabic Transcription' : 'English Translation'}
            </span>
            <button
              onClick={exitFullscreen}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Exit fullscreen"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div 
            ref={fullscreenScrollRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col justify-end"
          >
            <p 
              className={`text-white text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center whitespace-pre-wrap ${
                fullscreenMode === 'arabic' ? 'font-arabic' : ''
              }`}
              dir={fullscreenMode === 'arabic' ? 'rtl' : 'ltr'}
            >
              {fullscreenContent.text}
            </p>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="flex flex-col gap-3 md:gap-4 w-full max-w-6xl mx-auto">
        {/* Top Row: Server Status + Recording Control */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Server:</span>
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </Badge>
          </div>
          
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 touch-manipulation active:scale-95 ${
              connectionStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            disabled={connectionStatus !== 'connected'}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Record</span>
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Text Panels - Horizontal on md+, Vertical on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Arabic Transcription Panel */}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10">
                      <Mic className="h-3.5 w-3.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">Arabic</CardTitle>
                </div>
                <button
                  onClick={() => enterFullscreen('arabic')}
                  className="p-1.5 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation"
                  aria-label="Fullscreen Arabic text"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div
                ref={arabicScrollRef}
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex flex-col justify-end"
              >
                <p className="text-foreground text-lg md:text-xl leading-relaxed text-center font-arabic whitespace-pre-wrap max-w-full" dir="rtl">
                  {transcription || 'Waiting for speech...'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* English Translation Panel */}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10">
                      <Volume2 className="h-3.5 w-3.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">English</CardTitle>
                </div>
                <button
                  onClick={() => enterFullscreen('english')}
                  className="p-1.5 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation"
                  aria-label="Fullscreen English text"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2">
              <div
                ref={englishScrollRef}
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex flex-col justify-end"
              >
                <p className="text-foreground text-lg md:text-xl leading-relaxed text-center whitespace-pre-wrap max-w-full">
                  {translation || 'Translation will appear here...'}
                </p>
              </div>
              {quranReferences.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-border/40">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Surah/Ayat</span>
                  {quranReferences.map((ref) => (
                    <Badge key={ref} variant="secondary" className="text-xs font-mono tabular-nums">
                      {ref}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Minimal Instructions */}
        <div className="text-center text-white/50 text-xs">
          <p>Tap record and speak in Arabic</p>
        </div>
      </div>
    </>
  )
}

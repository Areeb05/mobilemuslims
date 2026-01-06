import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from './ui/button'
import { Mic, Square, Volume2 } from 'lucide-react'

interface AudioStreamerProps {
  endpoint?: string
}

export default function AudioStreamer({ endpoint = '/api/stream' }: AudioStreamerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null)
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
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    console.log('Attempting to connect to Socket.IO at:', socketUrl)
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })
      setIsRecording(true)
      setError('')

      // Use Web Audio API for audio processing with downsampling
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream)
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)

      processorNodeRef.current.onaudioprocess = (event: AudioProcessingEvent) => {
        const audioData = event.inputBuffer.getChannelData(0)
        const int16Array = new Int16Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF
        }
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('audio', int16Array.buffer)
        }
      }

      sourceNodeRef.current.connect(processorNodeRef.current)
      processorNodeRef.current.connect(audioContextRef.current.destination)

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

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400'
      case 'connecting': return 'text-yellow-400'
      case 'disconnected': return 'text-red-400'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Connection Status */}
      <div className="flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-400' :
          connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
        }`}></div>
        <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
      </div>

      {/* Control Button */}
      <div className="flex justify-center">
        <button
          onClick={toggleRecording}
          className={`flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25'
              : 'bg-gold hover:bg-gold/90 text-black shadow-lg shadow-gold/25'
          }`}
          disabled={connectionStatus !== 'connected'}
        >
          {isRecording ? (
            <>
              <Square className="h-6 w-6" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-6 w-6" />
              Start Recording
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg">
          Error: {error}
        </div>
      )}

      {/* Transcription Display */}
      <div className="space-y-4">
        {/* Arabic Transcription */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-semibold text-gold">Arabic Transcription</h3>
          </div>
          <div
            ref={scrollRef}
            className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-gray-800/30"
          >
            <p className="text-white text-lg leading-relaxed text-right font-arabic whitespace-pre-wrap" dir="rtl">
              {transcription || 'Waiting for speech...'}
            </p>
          </div>
        </div>

        {/* English Translation */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-400">English Translation</h3>
          </div>
          <div
            ref={scrollRef}
            className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400/30 scrollbar-track-blue-900/30"
          >
            <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
              {translation || 'Translation will appear here...'}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-gray-400 text-sm space-y-1">
        <p>Click "Start Recording" and speak clearly in Arabic</p>
        <p>Text will stream in real-time with automatic translation</p>
      </div>
    </div>
  )
}

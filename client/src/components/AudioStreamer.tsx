import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import UnderstandSalahPanels from './understand-salah/UnderstandSalahPanels'

interface AudioStreamerProps {
  endpoint?: string
}

export default function AudioStreamer({ endpoint = '/api/stream' }: AudioStreamerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [quranReferences, setQuranReferences] = useState<string[]>([])

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    const socketUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001')
    console.log('Attempting to connect to Socket.IO at:', socketUrl || 'same domain (production)')
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
    })

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
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('Screen wake lock acquired')
        } catch (wakeLockErr) {
          console.warn('Wake lock not available:', wakeLockErr)
        }
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 16000, min: 8000 },
          channelCount: { ideal: 1 },
          sampleSize: { ideal: 16 },
          googEchoCancellation: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googAutoGainControl: { ideal: true },
          googHighpassFilter: { ideal: true },
          googAudioMirroring: { ideal: false },
          ...(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
            ? {
                googEchoCancellation2: { ideal: true },
                googNoiseSuppression2: { ideal: true },
              }
            : {}),
        } as MediaStreamConstraints['audio'],
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setIsRecording(true)
      setError('')
      setQuranReferences([])
      if (socketRef.current?.connected) {
        socketRef.current.emit('recordingSessionStart')
      }

      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive',
      })

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream)

      try {
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js')
        processorNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor', {
          parameterData: {
            bufferSize: 2048,
          },
        })

        processorNodeRef.current.port.onmessage = (event: MessageEvent) => {
          if (event.data.type === 'audio' && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio', event.data.buffer)
          }
        }
      } catch (workletError) {
        console.warn('AudioWorklet not supported, falling back to ScriptProcessor:', workletError)
        processorNodeRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1)

        processorNodeRef.current.onaudioprocess = (event: AudioProcessingEvent) => {
          const audioData = event.inputBuffer.getChannelData(0)
          const int16Array = new Int16Array(audioData.length)

          let energy = 0
          for (let i = 0; i < audioData.length; i++) {
            energy += audioData[i] * audioData[i]
            int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff
          }
          const rms = Math.sqrt(energy / audioData.length)
          const threshold = 0.01

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
      void startRecording()
    }
  }

  const statusText =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
        ? 'Connecting...'
        : 'Disconnected'

  return (
    <UnderstandSalahPanels
      statusPrefix="Server"
      statusText={statusText}
      statusActive={connectionStatus === 'connected'}
      isRecording={isRecording}
      canRecord={connectionStatus === 'connected'}
      transcription={transcription}
      translation={translation}
      error={error}
      quranReferences={quranReferences}
      onToggleRecord={toggleRecording}
    />
  )
}

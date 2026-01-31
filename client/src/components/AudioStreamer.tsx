import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Mic, Square, Volume2, Maximize2, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { ModeToggle } from './ModeToggle'
import { QuranSettings } from './QuranSettings'
import { useQuranSettings, TRANSLATION_EDITIONS } from '@/contexts/QuranSettingsContext'
import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition'
import { 
  searchVerse, 
  preloadQuranMatcher, 
  matchAgainstExpected,
  createFollowingState,
  advanceFollowingState,
  detectSurahChange,
  analyzeEndOfSurah,
  searchWithAlFatihaPriority,
  LOCK_CONFIDENCE_THRESHOLD,
  type QuranMatch,
  type FollowingState
} from '@/lib/quran-matcher'

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
  
  // Quran mode state
  const [quranMatch, setQuranMatch] = useState<QuranMatch | null>(null)
  const [isVerified, setIsVerified] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [quranDataLoaded, setQuranDataLoaded] = useState(false)
  
  // Verse following state
  const [followingState, setFollowingState] = useState<FollowingState | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  
  // Settings context
  const { settings, setMode } = useQuranSettings()
  
  // Web Speech API for Quran mode (client-side)
  const speechRecognition = useSpeechRecognition({
    language: 'ar-SA',
    continuous: true,
    interimResults: true
  })

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const arabicScrollRef = useRef<HTMLDivElement | null>(null)
  const englishScrollRef = useRef<HTMLDivElement | null>(null)
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchIdRef = useRef<number>(0) // Counter to track and cancel stale searches

  // Preload Quran data on mount for faster matching
  useEffect(() => {
    preloadQuranMatcher(settings.edition)
      .then(() => {
        setQuranDataLoaded(true)
        console.log('Quran data preloaded for client-side matching')
      })
      .catch(err => {
        console.error('Failed to preload Quran data:', err)
      })
  }, [settings.edition])

  // Sync Web Speech API transcript for Quran mode
  useEffect(() => {
    if (settings.mode === 'quran' && speechRecognition.transcript) {
      setTranscription(speechRecognition.transcript)
    }
  }, [settings.mode, speechRecognition.transcript])

  // Handle speech recognition errors
  useEffect(() => {
    if (settings.mode === 'quran' && speechRecognition.error) {
      setError(speechRecognition.error)
    }
  }, [settings.mode, speechRecognition.error])

  // Two-phase verse matching for Quran mode
  // Phase 1 (Detection): Search all verses until high confidence match
  // Phase 2 (Following): Match against expected verses, track progression
  useEffect(() => {
    if (settings.mode !== 'quran' || !transcription || transcription.length < 5) {
      return
    }

    // Debounce the search to avoid excessive calls
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Increment search ID to track this specific search
    const currentSearchId = ++searchIdRef.current

    searchTimeoutRef.current = setTimeout(async () => {
      // Check if this search is still current before starting
      if (currentSearchId !== searchIdRef.current) {
        return // A newer search has been initiated
      }

      setIsSearching(true)
      try {
        // FOLLOWING MODE: Match against expected verses
        if (isFollowing && followingState) {
          const expectedMatch = matchAgainstExpected(
            transcription,
            followingState.verses,
            followingState.currentIndex
          )

          // Check if this search is still current after sync operation
          if (currentSearchId !== searchIdRef.current) return

          if (expectedMatch.matched) {
            // Update position based on match result
            if (expectedMatch.isCurrentVerse) {
              // Still on current verse - no change needed
              setIsVerified(true)
            } else if (expectedMatch.isNextVerse || expectedMatch.isSkipAhead) {
              // Moved to next verse or skipped ahead - advance state
              const newState = await advanceFollowingState(
                followingState,
                expectedMatch.verseIndex,
                settings.edition
              )
              
              // Check if search is still current after async operation
              if (currentSearchId !== searchIdRef.current) return

              setFollowingState(newState)
              
              // Update quranMatch to reflect current verse
              const currentVerse = newState.verses[newState.currentIndex]
              if (currentVerse) {
                setQuranMatch({
                  found: true,
                  surah: currentVerse.surah,
                  ayah: currentVerse.ayah,
                  surahName: currentVerse.surahName,
                  surahNameArabic: currentVerse.surahNameArabic,
                  arabicText: currentVerse.arabicText,
                  translation: currentVerse.translation,
                  edition: settings.edition,
                  confidence: expectedMatch.confidence
                })
                setTranslation(currentVerse.translation)
              }
              setIsVerified(true)
            }
          } else {
            // No match in expected verses - analyze end-of-surah situation
            const endAnalysis = analyzeEndOfSurah(followingState, transcription)
            
            if (endAnalysis.isAtEnd || endAnalysis.isAlFatihaLikely) {
              // At end of surah or Al-Fatiha detected - search with priority
              console.log('End of surah detected or Al-Fatiha likely, searching with priority...')
              
              const priorityMatch = endAnalysis.isAlFatihaLikely
                ? await searchWithAlFatihaPriority(transcription, settings.edition)
                : await detectSurahChange(transcription, followingState.lockedPosition.surah, settings.edition)
              
              // Check if search is still current after async operation
              if (currentSearchId !== searchIdRef.current) return

              if (priorityMatch) {
                // Found new surah - re-lock to new position
                console.log('Surah transition detected:', priorityMatch.surahName, priorityMatch.surah + ':' + priorityMatch.ayah)
                const newState = await createFollowingState(priorityMatch, settings.edition)
                
                // Check again after createFollowingState
                if (currentSearchId !== searchIdRef.current) return

                setFollowingState(newState)
                setQuranMatch(priorityMatch)
                setTranslation(priorityMatch.translation)
                setIsVerified(true)
              } else {
                // No match found - show uncertain state but keep following
                setIsVerified(false)
              }
            } else {
              // Not at end - check for regular surah change
              const surahChange = await detectSurahChange(
                transcription,
                followingState.lockedPosition.surah,
                settings.edition
              )

              // Check if search is still current after async operation
              if (currentSearchId !== searchIdRef.current) return

              if (surahChange) {
                // Detected new surah - re-lock to new position
                console.log('Surah change detected:', surahChange.surahName)
                const newState = await createFollowingState(surahChange, settings.edition)
                
                // Check again after createFollowingState
                if (currentSearchId !== searchIdRef.current) return

                setFollowingState(newState)
                setQuranMatch(surahChange)
                setTranslation(surahChange.translation)
                setIsVerified(true)
              } else {
                // No match found - show uncertain state but keep following
                setIsVerified(false)
              }
            }
          }
        } else {
          // DETECTION MODE: Search all verses
          const match = await searchVerse(transcription, settings.edition)
          
          // Check if search is still current after async operation
          if (currentSearchId !== searchIdRef.current) return

          if (match) {
            setQuranMatch(match)
            setTranslation(match.translation)
            setIsVerified(true)

            // Check if we should lock and start following
            if (match.confidence >= LOCK_CONFIDENCE_THRESHOLD) {
              console.log('High confidence match - locking to verse:', 
                `${match.surahName} ${match.surah}:${match.ayah}`, 
                `(${(match.confidence * 100).toFixed(1)}%)`
              )
              const newState = await createFollowingState(match, settings.edition)
              
              // Check again after createFollowingState
              if (currentSearchId !== searchIdRef.current) return

              setFollowingState(newState)
              setIsFollowing(true)
            }
          } else {
            // No match found - keep transcription but show unverified
            setIsVerified(false)
            setQuranMatch(null)
          }
        }
      } catch (err) {
        // Only log error if this search is still current
        if (currentSearchId === searchIdRef.current) {
          console.error('Error in verse matching:', err)
        }
      } finally {
        // Only update searching state if this search is still current
        if (currentSearchId === searchIdRef.current) {
          setIsSearching(false)
        }
      }
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [transcription, settings.mode, settings.edition, isFollowing, followingState])

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
    const socket = io(socketUrl, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    // Socket event handlers - defined as named functions for proper cleanup
    const handleConnect = () => {
      console.log('Connected to Socket.IO server at:', socketUrl)
      setError('')
      setConnectionStatus('connected')
    }

    const handleConnectError = (err: Error) => {
      console.error('Socket.IO connection error:', err.message)
      setError('Connection failed: ' + err.message)
      setConnectionStatus('disconnected')
    }

    const handleTranscription = (data: string) => {
      setTranscription(data)
    }

    const handleTranslation = (data: string | { text: string; verified: boolean }) => {
      if (typeof data === 'object' && data !== null) {
        setTranslation(data.text)
        setIsVerified(data.verified)
        setQuranMatch(null) // Clear Quran match when using Google Translate
      } else {
        setTranslation(data)
        setIsVerified(true)
        setQuranMatch(null)
      }
    }

    const handleQuranMatch = (data: QuranMatch) => {
      setQuranMatch(data)
      setTranslation(data.translation)
      setIsVerified(true)
    }

    const handleError = (err: string) => {
      setError(err)
      setConnectionStatus('disconnected')
    }

    const handleDisconnect = (reason: string) => {
      console.log('Disconnected from Socket.IO server. Reason:', reason)
      setError('Disconnected from server: ' + reason)
      setConnectionStatus('disconnected')
    }

    // Attach event listeners
    socket.on('connect', handleConnect)
    socket.on('connect_error', handleConnectError)
    socket.on('transcription', handleTranscription)
    socket.on('translation', handleTranslation)
    socket.on('quranMatch', handleQuranMatch)
    socket.on('error', handleError)
    socket.on('disconnect', handleDisconnect)

    return () => {
      // Remove all event listeners before disconnecting
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('transcription', handleTranscription)
      socket.off('translation', handleTranslation)
      socket.off('quranMatch', handleQuranMatch)
      socket.off('error', handleError)
      socket.off('disconnect', handleDisconnect)
      
      // Release wake lock if held
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
      
      // Disconnect socket
      socket.disconnect()
      socketRef.current = null
    }
  }, [endpoint])

  // Send mode changes to server
  const handleModeChange = useCallback((newMode: 'quran' | 'dua') => {
    setMode(newMode)
    // Clear current match and following state when switching modes
    setQuranMatch(null)
    setFollowingState(null)
    setIsFollowing(false)
    if (socketRef.current?.connected) {
      socketRef.current.emit('setMode', { mode: newMode })
    }
  }, [setMode])

  // Send settings changes to server when they change
  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('setSettings', settings)
    }
  }, [settings])

  const startRecording = async () => {
    try {
      // Clear previous session data
      setTranscription('')
      setTranslation('')
      setQuranMatch(null)
      setIsVerified(true)
      setError('')
      setFollowingState(null)
      setIsFollowing(false)

      // Request screen wake lock to keep screen on during prayer
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('Screen wake lock acquired')
        } catch (wakeLockErr) {
          console.warn('Wake lock not available:', wakeLockErr)
        }
      }

      // QURAN MODE: Use Web Speech API (fully client-side)
      if (settings.mode === 'quran') {
        if (!speechRecognition.isSupported) {
          setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
          return
        }

        speechRecognition.resetTranscript()
        speechRecognition.startListening()
        setIsRecording(true)
        console.log('Started client-side speech recognition for Quran mode')
        return
      }

      // DUA MODE: Use server-side processing via WebSocket
      if (connectionStatus !== 'connected') {
        setError('Not connected to server. Please wait or refresh.')
        return
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

  const stopRecording = useCallback(() => {
    setIsRecording(false)

    // Release screen wake lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {
        // Ignore release errors
      })
      wakeLockRef.current = null
      console.log('Screen wake lock released')
    }

    // Stop Web Speech API for Quran mode
    if (speechRecognition.isListening) {
      speechRecognition.stopListening()
    }

    // Stop server-side audio processing for Dua mode
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Ignore errors when already stopped
      }
      mediaRecorderRef.current = null
    }

    // Disconnect audio nodes with error handling
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect()
      } catch {
        // Node may already be disconnected
      }
      processorNodeRef.current = null
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch {
        // Node may already be disconnected
      }
      sourceNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Ignore errors when closing context
      })
      audioContextRef.current = null
    }
  }, [speechRecognition])

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

  // Cleanup fullscreen overflow on unmount
  useEffect(() => {
    return () => {
      // Restore body overflow if component unmounts while in fullscreen
      document.body.style.overflow = 'auto'
    }
  }, [])

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
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">
                {fullscreenMode === 'arabic' ? 'Arabic Transcription' : 'English Translation'}
              </span>
              {/* Following mode indicator */}
              {isFollowing && (
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  Following
                </span>
              )}
              {/* Verification indicator in English fullscreen */}
              {fullscreenMode === 'english' && settings.mode === 'quran' && (translation || isFollowing) && (
                <span className="flex items-center gap-1">
                  {isVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Unverified</span>
                    </>
                  )}
                </span>
              )}
            </div>
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
            className="flex-1 overflow-y-auto p-6"
          >
            {/* Multi-verse fullscreen view in following mode */}
            {isFollowing && followingState ? (
              <div className={`space-y-6 ${fullscreenMode === 'arabic' ? 'direction-rtl' : ''}`}
                   dir={fullscreenMode === 'arabic' ? 'rtl' : 'ltr'}>
                {followingState.verses.map((verse) => (
                  <div 
                    key={`${verse.surah}-${verse.ayah}-fs`}
                    className={`p-4 rounded-xl transition-all duration-300 ${
                      verse.isCurrent 
                        ? 'bg-emerald-500/20 border-2 border-emerald-500/40' 
                        : verse.isPast 
                          ? 'opacity-40' 
                          : 'opacity-70'
                    }`}
                  >
                    <p 
                      className={`text-white text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center whitespace-pre-wrap ${
                        fullscreenMode === 'arabic' ? 'font-arabic' : ''
                      }`}
                    >
                      {fullscreenMode === 'arabic' ? verse.arabicText : verse.translation}
                    </p>
                    {settings.showVerseRef && (
                      <p className={`text-lg text-center mt-3 font-medium ${
                        verse.isCurrent ? 'text-emerald-400' : 'text-white/40'
                      }`}>
                        {fullscreenMode === 'arabic' 
                          ? `${verse.surahNameArabic} ${verse.surah}:${verse.ayah}`
                          : `${verse.surahName} ${verse.surah}:${verse.ayah}`
                        }
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Single verse fullscreen view (detection mode)
              <>
                <p 
                  className={`text-white text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center whitespace-pre-wrap ${
                    fullscreenMode === 'arabic' ? 'font-arabic' : ''
                  }`}
                  dir={fullscreenMode === 'arabic' ? 'rtl' : 'ltr'}
                >
                  {fullscreenContent.text}
                </p>

                {/* Verse reference in Arabic fullscreen */}
                {fullscreenMode === 'arabic' && quranMatch && settings.showVerseRef && (
                  <p className="text-emerald-400 text-lg text-center mt-4 font-medium">
                    {quranMatch.surahName} {quranMatch.surah}:{quranMatch.ayah}
                  </p>
                )}

                {/* Edition attribution in English fullscreen */}
                {fullscreenMode === 'english' && quranMatch && (
                  <p className="text-white/40 text-sm text-center mt-4">
                    {TRANSLATION_EDITIONS.find(e => e.code === quranMatch.edition)?.name || quranMatch.edition}
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Edition attribution at bottom for following mode */}
          {isFollowing && fullscreenMode === 'english' && (
            <div className="p-4 border-t border-white/10 text-center">
              <p className="text-white/40 text-sm">
                {TRANSLATION_EDITIONS.find(e => e.code === settings.edition)?.name || settings.edition}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Interface */}
      <div className="flex flex-col gap-3 md:gap-4 w-full max-w-6xl mx-auto">
        {/* Top Row: Settings + Recording Control + Status */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <QuranSettings />
          
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 touch-manipulation active:scale-95 ${
              // In Quran mode, only need speech recognition support
              // In Dua mode, need server connection
              (settings.mode === 'quran' ? !speechRecognition.isSupported : connectionStatus !== 'connected')
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105'
            }`}
            disabled={settings.mode === 'quran' ? !speechRecognition.isSupported : connectionStatus !== 'connected'}
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

          {/* Status indicator - different for each mode */}
          {settings.mode === 'quran' ? (
            // Quran mode: Show client-side status (no server needed)
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Local:</span>
              <span 
                className={`h-2 w-2 rounded-full ${
                  quranDataLoaded && speechRecognition.isSupported
                    ? 'bg-emerald-500' 
                    : 'bg-yellow-500 animate-pulse'
                }`}
                aria-label={quranDataLoaded ? 'Ready' : 'Loading...'}
              />
              {isSearching && <span className="text-yellow-400 animate-pulse">matching...</span>}
            </div>
          ) : (
            // Dua mode: Show server connection status
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Server:</span>
              <span 
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-emerald-500' 
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
                aria-label={connectionStatus === 'connected' ? 'Connected' :
                            connectionStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
              />
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <ModeToggle
            mode={settings.mode}
            onChange={handleModeChange}
            disabled={false}
          />
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
                  {/* Following mode indicator */}
                  {isFollowing && (
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      Following
                    </span>
                  )}
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
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              >
                {/* Multi-verse view in following mode */}
                {isFollowing && followingState ? (
                  <div className="space-y-3" dir="rtl">
                    {followingState.verses.map((verse) => (
                      <div 
                        key={`${verse.surah}-${verse.ayah}`}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          verse.isCurrent 
                            ? 'bg-emerald-500/20 border border-emerald-500/40' 
                            : verse.isPast 
                              ? 'opacity-50' 
                              : 'opacity-80'
                        }`}
                      >
                        <p className="text-foreground text-lg md:text-xl leading-relaxed text-center font-arabic whitespace-pre-wrap">
                          {verse.arabicText}
                        </p>
                        {settings.showVerseRef && (
                          <p className={`text-xs text-center mt-1 font-medium ${
                            verse.isCurrent ? 'text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {verse.surah}:{verse.ayah}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single verse view (detection mode)
                  <>
                    <p className="text-foreground text-lg md:text-xl leading-relaxed text-center font-arabic whitespace-pre-wrap max-w-full" dir="rtl">
                      {transcription || 'Waiting for speech...'}
                    </p>
                    {/* Verse reference below text */}
                    {quranMatch && settings.showVerseRef && (
                      <p className="text-xs text-emerald-400 text-center mt-2 font-medium">
                        {quranMatch.surahName} {quranMatch.surah}:{quranMatch.ayah}
                      </p>
                    )}
                  </>
                )}
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
                  {/* Verification indicator with label */}
                  {settings.mode === 'quran' && (translation || isFollowing) && (
                    <span className="flex items-center gap-1">
                      {isVerified ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                          <span className="hidden sm:inline text-xs text-emerald-400">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <span className="hidden sm:inline text-xs text-yellow-400">Unverified</span>
                        </>
                      )}
                    </span>
                  )}
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
            <CardContent className="py-2 px-4">
              <div
                ref={englishScrollRef}
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              >
                {/* Multi-verse view in following mode */}
                {isFollowing && followingState ? (
                  <div className="space-y-3">
                    {followingState.verses.map((verse) => (
                      <div 
                        key={`${verse.surah}-${verse.ayah}-en`}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          verse.isCurrent 
                            ? 'bg-emerald-500/20 border border-emerald-500/40' 
                            : verse.isPast 
                              ? 'opacity-50' 
                              : 'opacity-80'
                        }`}
                      >
                        <p className="text-foreground text-lg md:text-xl leading-relaxed text-center whitespace-pre-wrap">
                          {verse.translation}
                        </p>
                        {settings.showVerseRef && (
                          <p className={`text-xs text-center mt-1 font-medium ${
                            verse.isCurrent ? 'text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {verse.surah}:{verse.ayah}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single verse view (detection mode)
                  <p className="text-foreground text-lg md:text-xl leading-relaxed text-center whitespace-pre-wrap max-w-full">
                    {translation || 'Translation will appear here...'}
                  </p>
                )}
              </div>
              {/* Edition attribution - fixed at bottom outside scroll */}
              {(quranMatch || isFollowing) && (
                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30 mt-2">
                  {TRANSLATION_EDITIONS.find(e => e.code === settings.edition)?.name || settings.edition}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Minimal Instructions */}
        <div className="text-center text-white/50 text-xs">
          <p>
            {settings.mode === 'quran'
              ? 'Tap record and recite Quran (works offline, no server needed)'
              : 'Tap record and speak in Arabic (requires server connection)'}
          </p>
          {settings.mode === 'quran' && !speechRecognition.isSupported && (
            <p className="text-yellow-400 mt-1">
              Speech recognition not supported. Please use Chrome or Edge.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

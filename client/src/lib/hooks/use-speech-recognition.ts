/**
 * React hook for Web Speech API speech recognition.
 * Provides real-time speech-to-text transcription.
 */

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Speech recognition options.
 */
export interface SpeechRecognitionOptions {
  /** BCP 47 language tag (e.g., 'ar-SA' for Arabic) */
  language?: string
  /** Whether to continuously recognize or stop after first result */
  continuous?: boolean
  /** Whether to return interim (partial) results */
  interimResults?: boolean
}

/**
 * Speech recognition hook return value.
 */
export interface UseSpeechRecognitionReturn {
  /** Current transcript text */
  transcript: string
  /** Whether the recognizer is currently listening */
  isListening: boolean
  /** Whether speech recognition is supported in this browser */
  isSupported: boolean
  /** Any error that occurred */
  error: string | null
  /** Start listening for speech */
  startListening: () => void
  /** Stop listening for speech */
  stopListening: () => void
  /** Reset the transcript */
  resetTranscript: () => void
}

/**
 * Extended Window interface for speech recognition.
 */
interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

/**
 * Get the SpeechRecognition constructor if available.
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  
  const win = window as SpeechRecognitionWindow
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

/**
 * React hook for Web Speech API speech recognition.
 *
 * @param options - Speech recognition options
 * @returns Speech recognition state and controls
 *
 * @example
 * ```tsx
 * const { transcript, isListening, startListening, stopListening } = useSpeechRecognition({
 *   language: 'ar-SA',
 *   continuous: true,
 *   interimResults: true
 * })
 * ```
 */
export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = 'ar-SA',
    continuous = true,
    interimResults = true
  } = options

  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalizedTranscriptRef = useRef<string>('')
  const lastFinalResultRef = useRef<string>('') // Track last final result to prevent duplicates
  const processedResultIndexRef = useRef<number>(-1) // Track processed result indices
  const SpeechRecognitionClass = getSpeechRecognition()
  const isSupported = SpeechRecognitionClass !== null

  /**
   * Initialize the speech recognition instance.
   */
  const initRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (!SpeechRecognitionClass) return null

    const recognition = new SpeechRecognitionClass()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      // Map error codes to user-friendly messages
      let errorMessage = 'Speech recognition error'
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow access.'
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        case 'aborted':
          // User stopped, not an error
          errorMessage = ''
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }
      
      if (errorMessage) {
        setError(errorMessage)
      }
      setIsListening(false)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      // Debug: Log raw event details
      console.log('[SpeechRecognition] onresult event:', {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length,
        processedUpTo: processedResultIndexRef.current,
        timestamp: new Date().toISOString()
      })

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        // Check bounds before accessing alternatives
        if (result.length > 0) {
          const transcriptText = result[0].transcript
          const confidence = result[0].confidence
          
          // Debug: Log each result
          console.log(`[SpeechRecognition] Result[${i}]:`, {
            isFinal: result.isFinal,
            transcript: transcriptText,
            confidence: confidence?.toFixed(3) || 'N/A',
            alreadyProcessed: result.isFinal && i <= processedResultIndexRef.current
          })
          
          if (result.isFinal) {
            // Skip if we've already processed this result index (prevents duplicates)
            if (i <= processedResultIndexRef.current) {
              console.log(`[SpeechRecognition] Skipping already processed result[${i}]`)
              continue
            }
            
            // Check for duplicate content (same text as last final)
            const normalizedNew = transcriptText.trim()
            const normalizedLast = lastFinalResultRef.current.trim()
            if (normalizedNew === normalizedLast) {
              console.log('[SpeechRecognition] Skipping duplicate final result:', normalizedNew)
              processedResultIndexRef.current = i
              continue
            }
            
            finalTranscript += transcriptText
            lastFinalResultRef.current = transcriptText
            processedResultIndexRef.current = i
          } else {
            interimTranscript += transcriptText
          }
        }
      }

      // Handle final results - append to finalized transcript
      if (finalTranscript) {
        const previousFinalized = finalizedTranscriptRef.current
        finalizedTranscriptRef.current = finalizedTranscriptRef.current
          ? `${finalizedTranscriptRef.current} ${finalTranscript}`.trim()
          : finalTranscript
        
        // Debug: Log finalization
        console.log('[SpeechRecognition] Finalized:', {
          previous: previousFinalized,
          added: finalTranscript,
          new: finalizedTranscriptRef.current
        })
      }

      // Update displayed transcript: finalized + current interim (replacing, not appending interim)
      const displayTranscript = finalizedTranscriptRef.current
        ? interimTranscript
          ? `${finalizedTranscriptRef.current} ${interimTranscript}`.trim()
          : finalizedTranscriptRef.current
        : interimTranscript

      // Debug: Log display update
      if (displayTranscript || finalTranscript) {
        console.log('[SpeechRecognition] Display update:', {
          finalizedPart: finalizedTranscriptRef.current,
          interimPart: interimTranscript,
          displayTranscript: displayTranscript
        })
        setTranscript(displayTranscript)
      }
    }

    return recognition
  }, [SpeechRecognitionClass, language, continuous, interimResults])

  /**
   * Start listening for speech.
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    // Stop existing recognition if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore errors when stopping
      }
    }

    // Clear previous transcript and tracking refs
    setTranscript('')
    setError(null)
    finalizedTranscriptRef.current = ''
    lastFinalResultRef.current = ''
    processedResultIndexRef.current = -1

    // Create new recognition instance
    const recognition = initRecognition()
    if (!recognition) {
      setError('Failed to initialize speech recognition')
      return
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setError('Failed to start speech recognition. Please try again.')
    }
  }, [isSupported, initRecognition])

  /**
   * Stop listening for speech.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  /**
   * Reset the transcript.
   */
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
    finalizedTranscriptRef.current = ''
    lastFinalResultRef.current = ''
    processedResultIndexRef.current = -1
  }, [])

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          // Use abort() for cleanup as it's more immediate than stop()
          recognitionRef.current.abort()
        } catch {
          // Ignore errors when aborting
        }
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}

/**
 * Check if speech recognition is supported in the current browser.
 *
 * @returns True if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null
}

import { useCallback, useEffect, useRef, useState } from 'react'

const WHISPER_MODEL = 'onnx-community/whisper-tiny'
const TRANSLATION_MODEL = 'Xenova/opus-mt-ar-en'
/** Rolling window of audio for each ASR pass (16 kHz samples). */
const MAX_RING_SAMPLES = 16000 * 12
const INFER_INTERVAL_MS = 2800
const MIN_SAMPLES_FOR_ASR = 16000

type AsrFn = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<{ text?: string }>
type TranslateFn = (text: string) => Promise<unknown>

function appendPcmToRing(ring: Float32Array, int16Buffer: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(int16Buffer)
  const chunk = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    chunk[i] = int16[i] / 32768
  }
  const total = ring.length + chunk.length
  if (total <= MAX_RING_SAMPLES) {
    const next = new Float32Array(total)
    next.set(ring, 0)
    next.set(chunk, ring.length)
    return next
  }
  const next = new Float32Array(MAX_RING_SAMPLES)
  const overflow = total - MAX_RING_SAMPLES
  if (overflow < ring.length) {
    const tail = ring.subarray(overflow)
    next.set(tail, 0)
    next.set(chunk, tail.length)
  } else {
    next.set(chunk.subarray(chunk.length - MAX_RING_SAMPLES), 0)
  }
  return next
}

function extractTranslationText(raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return extractTranslationText(raw[0])
  }
  if (typeof raw === 'object') {
    const o = raw as { translation_text?: string; translated_text?: string }
    if (typeof o.translation_text === 'string') return o.translation_text
    if (typeof o.translated_text === 'string') return o.translated_text
  }
  return ''
}

export interface UseTransformersUnderstandSalahResult {
  engineStatus: 'loading' | 'ready' | 'error'
  statusDetail: string
  transcription: string
  translation: string
  error: string
  /** Append mono 16-bit PCM little-endian from ScriptProcessor / capture */
  feedPcm16: (buffer: ArrayBuffer) => void
  startInferenceLoop: () => void
  stopInferenceLoop: () => void
  resetSessionText: () => void
}

/**
 * Loads Whisper (Arabic ASR) and opus-mt (ar→en) in the browser via Transformers.js.
 * Runs periodic ASR on a rolling audio buffer while recording; debounces translation.
 */
export function useTransformersUnderstandSalah(): UseTransformersUnderstandSalahResult {
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [statusDetail, setStatusDetail] = useState('Loading models…')
  const [transcription, setTranscription] = useState('')
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')

  const asrRef = useRef<AsrFn | null>(null)
  const translatorRef = useRef<TranslateFn | null>(null)
  const ringRef = useRef<Float32Array>(new Float32Array(0))
  const inferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const translateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers')
        env.allowLocalModels = false
        env.useBrowserCache = true

        const webgpu = typeof navigator !== 'undefined' && !!(navigator as Navigator & { gpu?: unknown }).gpu
        const asrDevice = webgpu ? 'webgpu' : 'wasm'

        setStatusDetail(`Loading speech (${asrDevice})…`)

        const asrProgress = (e: { progress?: number; status?: string }) => {
          if (typeof e?.progress === 'number') {
            setStatusDetail(`Loading speech… ${Math.round(e.progress)}%`)
          }
        }

        let asr: AsrFn
        try {
          asr = (await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
            device: asrDevice,
            dtype: webgpu ? 'fp32' : 'q8',
            progress_callback: asrProgress,
          })) as AsrFn
        } catch (firstErr) {
          if (cancelled) return
          console.warn('Whisper load retry with fp32/wasm', firstErr)
          asr = (await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
            device: 'wasm',
            dtype: 'fp32',
            progress_callback: asrProgress,
          })) as AsrFn
        }

        if (cancelled) return

        asrRef.current = asr

        setStatusDetail('Loading translation…')
        try {
          const translatorPipeline = (await pipeline('translation', TRANSLATION_MODEL, {
            device: 'wasm',
            dtype: 'q8',
            progress_callback: (e: { progress?: number }) => {
              if (typeof e?.progress === 'number') {
                setStatusDetail(`Loading translation… ${Math.round(e.progress)}%`)
              }
            },
          })) as TranslateFn
          if (!cancelled) {
            translatorRef.current = translatorPipeline
          }
        } catch (trErr) {
          console.warn('Translation model failed to load; Arabic-only offline mode.', trErr)
          translatorRef.current = null
        }

        if (cancelled) return

        setEngineStatus('ready')
        setStatusDetail('Ready')
        setError('')
      } catch (e) {
        if (cancelled) return
        console.error(e)
        setEngineStatus('error')
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setStatusDetail('Failed')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const feedPcm16 = useCallback((buffer: ArrayBuffer) => {
    ringRef.current = appendPcmToRing(ringRef.current, buffer)
  }, [])

  const runAsrOnce = useCallback(async () => {
    const asr = asrRef.current
    if (!asr) return
    const audio = ringRef.current
    if (audio.length < MIN_SAMPLES_FOR_ASR) return
    try {
      const slice = audio.slice()
      const out = await asr(slice, {
        language: 'ar',
        task: 'transcribe',
        return_timestamps: false,
      })
      const text = (out?.text ?? '').trim()
      if (text) {
        setTranscription(text)
      }
    } catch (err) {
      console.warn('ASR pass failed', err)
    }
  }, [])

  const startInferenceLoop = useCallback(() => {
    if (inferTimerRef.current) {
      clearInterval(inferTimerRef.current)
    }
    inferTimerRef.current = setInterval(() => {
      void runAsrOnce()
    }, INFER_INTERVAL_MS)
  }, [runAsrOnce])

  const stopInferenceLoop = useCallback(() => {
    if (inferTimerRef.current) {
      clearInterval(inferTimerRef.current)
      inferTimerRef.current = null
    }
    void runAsrOnce()
  }, [runAsrOnce])

  const resetSessionText = useCallback(() => {
    setTranscription('')
    setTranslation('')
    ringRef.current = new Float32Array(0)
  }, [])

  useEffect(() => {
    if (translateTimerRef.current) {
      clearTimeout(translateTimerRef.current)
    }
    const t = transcription.trim()
    if (!t) {
      setTranslation('')
      return
    }
    translateTimerRef.current = setTimeout(() => {
      void (async () => {
        const tr = translatorRef.current
        if (!tr) return
        try {
          const raw = await tr(t)
          const en = extractTranslationText(raw)
          setTranslation(en)
        } catch (err) {
          console.warn('Translation failed', err)
        }
      })()
    }, 450)
    return () => {
      if (translateTimerRef.current) {
        clearTimeout(translateTimerRef.current)
      }
    }
  }, [transcription])

  return {
    engineStatus,
    statusDetail,
    transcription,
    translation,
    error,
    feedPcm16,
    startInferenceLoop,
    stopInferenceLoop,
    resetSessionText,
  }
}

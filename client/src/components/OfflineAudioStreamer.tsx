import { useCallback, useRef, useState } from 'react'
import UnderstandSalahPanels from './understand-salah/UnderstandSalahPanels'
import { useTransformersUnderstandSalah } from '../hooks/useTransformersUnderstandSalah'

/** Client-only Understand Salah: Whisper ASR + opus-mt via Transformers.js; UI matches online AudioStreamer. */
export default function OfflineAudioStreamer() {
  const {
    engineStatus,
    statusDetail,
    transcription,
    translation,
    error,
    feedPcm16,
    startInferenceLoop,
    stopInferenceLoop,
    resetSessionText,
  } = useTransformersUnderstandSalah()

  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState('')
  const isRecordingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const tearDownAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    setIsRecording(false)
    stopInferenceLoop()

    if (wakeLockRef.current) {
      wakeLockRef.current.release()
      wakeLockRef.current = null
    }

    tearDownAudio()
  }, [stopInferenceLoop, tearDownAudio])

  const startRecording = useCallback(async () => {
    if (engineStatus !== 'ready') return

    setRecordError('')
    try {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch {
          /* optional */
        }
      }

      resetSessionText()

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 16000, min: 8000 },
          channelCount: { ideal: 1 },
          sampleSize: { ideal: 16 },
        } as MediaStreamConstraints['audio'],
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx({ sampleRate: 16000, latencyHint: 'interactive' })
      audioContextRef.current = ctx
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      const bufferSize = 4096
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!isRecordingRef.current) return
        const audioData = event.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          int16[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff
        }
        feedPcm16(int16.buffer)
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      isRecordingRef.current = true
      setIsRecording(true)
      startInferenceLoop()
    } catch (err) {
      console.error(err)
      setIsRecording(false)
      isRecordingRef.current = false
      setRecordError(
        'Failed to start recording: ' + (err instanceof Error ? err.message : String(err))
      )
      tearDownAudio()
    }
  }, [engineStatus, feedPcm16, resetSessionText, startInferenceLoop, tearDownAudio])

  const toggleRecording = () => {
    if (isRecordingRef.current) {
      stopRecording()
    } else {
      void startRecording()
    }
  }

  const statusText =
    engineStatus === 'loading'
      ? statusDetail
      : engineStatus === 'error'
        ? 'Error'
        : statusDetail

  const displayError = recordError || (engineStatus === 'error' ? error : '')

  return (
    <UnderstandSalahPanels
      statusPrefix="Offline"
      statusText={statusText}
      statusActive={engineStatus === 'ready'}
      isRecording={isRecording}
      canRecord={engineStatus === 'ready'}
      transcription={transcription}
      translation={translation}
      error={displayError}
      quranReferences={[]}
      onToggleRecord={toggleRecording}
    />
  )
}

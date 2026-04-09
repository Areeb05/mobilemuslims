import { useCallback, useRef, useState } from 'react'
import UnderstandSalahPanels from './understand-salah/UnderstandSalahPanels'
import { useTransformersUnderstandSalah } from '../hooks/useTransformersUnderstandSalah'
import { resampleMonoFloat32ToPcm16 } from '../lib/resampleAudio'

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
    retryLoadingModels,
  } = useTransformersUnderstandSalah()

  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState('')
  const isRecordingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const silenceGainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const tearDownAudio = useCallback(() => {
    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null
    silenceGainRef.current?.disconnect()
    silenceGainRef.current = null
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
      const ctx = new Ctx({ latencyHint: 'interactive' })
      audioContextRef.current = ctx
      const hardwareRate = ctx.sampleRate

      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      const base = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      const workletUrl = new URL('offline-capture.worklet.js', window.location.origin + base).href

      const attachWorklet = async () => {
        await ctx.audioWorklet.addModule(workletUrl)
        const node = new AudioWorkletNode(ctx, 'offline-capture-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
        })
        workletNodeRef.current = node
        node.port.onmessage = (ev: MessageEvent<Float32Array>) => {
          if (!isRecordingRef.current) return
          const data = ev.data
          if (!(data instanceof Float32Array) || data.length === 0) return
          const pcm = resampleMonoFloat32ToPcm16(data, hardwareRate)
          if (pcm.byteLength) feedPcm16(pcm)
        }
        const silent = ctx.createGain()
        silent.gain.value = 0
        silenceGainRef.current = silent
        source.connect(node)
        node.connect(silent)
        silent.connect(ctx.destination)
      }

      try {
        await attachWorklet()
      } catch (workletErr) {
        console.warn('AudioWorklet unavailable; using ScriptProcessor fallback', workletErr)
        const bufferSize = 4096
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1)
        processorRef.current = processor
        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          if (!isRecordingRef.current) return
          const audioData = event.inputBuffer.getChannelData(0)
          const rate = event.inputBuffer.sampleRate
          const pcm = resampleMonoFloat32ToPcm16(audioData, rate)
          if (pcm.byteLength) feedPcm16(pcm)
        }
        source.connect(processor)
        processor.connect(ctx.destination)
      }

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
      errorActionLabel={engineStatus === 'error' ? 'Retry loading models' : undefined}
      onErrorAction={engineStatus === 'error' ? retryLoadingModels : undefined}
    />
  )
}

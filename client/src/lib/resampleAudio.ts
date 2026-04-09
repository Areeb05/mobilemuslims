/** Whisper / offline pipeline expects 16 kHz mono PCM. */
export const TARGET_SAMPLE_RATE = 16000

/**
 * Resample mono float32 audio (Web Audio, typically 44.1/48 kHz on Safari) to 16 kHz
 * mono int16 little-endian PCM via linear interpolation.
 */
export function resampleMonoFloat32ToPcm16(
  input: Float32Array,
  inputSampleRate: number,
  targetRate: number = TARGET_SAMPLE_RATE,
): ArrayBuffer {
  if (inputSampleRate <= 0 || input.length === 0) {
    return new ArrayBuffer(0)
  }

  const toInt16 = (sample: number) => {
    const s = Math.max(-1, Math.min(1, sample))
    return s * 0x7fff
  }

  if (Math.abs(inputSampleRate - targetRate) < 1) {
    const out = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      out[i] = toInt16(input[i])
    }
    return out.buffer
  }

  const ratio = inputSampleRate / targetRate
  const outLen = Math.max(1, Math.floor(input.length / ratio))
  const out = new Int16Array(outLen)

  for (let j = 0; j < outLen; j++) {
    const srcPos = j * ratio
    const i0 = Math.floor(srcPos)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = srcPos - i0
    const s = input[i0] * (1 - frac) + input[i1] * frac
    out[j] = toInt16(s)
  }

  return out.buffer
}

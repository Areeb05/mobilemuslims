/**
 * Mono capture worklet for offline Understand Salah (Safari-friendly path).
 * Forwards input channel 0 to main thread; passthrough output keeps the graph alive.
 */
class OfflineCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    if (input.length > 0 && input[0].length > 0) {
      const ch = input[0]
      if (output.length > 0 && output[0].length === ch.length) {
        output[0].set(ch)
      }
      const copy = new Float32Array(ch.length)
      copy.set(ch)
      this.port.postMessage(copy, [copy.buffer])
    }
    return true
  }
}

registerProcessor('offline-capture-processor', OfflineCaptureProcessor)

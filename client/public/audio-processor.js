// AudioWorklet processor for real-time audio processing with VAD
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 2048
    this.buffer = new Int16Array(this.bufferSize)
    this.bufferIndex = 0
    this.vadThreshold = 0.01 // Voice activity detection threshold
    this.vadWindow = 512 // VAD analysis window size
    this.vadHistory = new Array(10).fill(0) // Keep history for stability
    this.vadHistoryIndex = 0
  }

  process(inputs, outputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const inputData = input[0]

    // Process audio data and apply VAD
    for (let i = 0; i < inputData.length; i++) {
      // Convert float32 to int16
      const sample = Math.max(-1, Math.min(1, inputData[i]))
      this.buffer[this.bufferIndex] = sample * 0x7FFF

      // Simple energy-based VAD
      if (this.bufferIndex % this.vadWindow === 0 && this.bufferIndex > 0) {
        const windowStart = Math.max(0, this.bufferIndex - this.vadWindow)
        const windowData = this.buffer.slice(windowStart, this.bufferIndex)

        let energy = 0
        for (let j = 0; j < windowData.length; j++) {
          energy += (windowData[j] / 0x7FFF) ** 2
        }
        const rms = Math.sqrt(energy / windowData.length)

        // Update VAD history
        this.vadHistory[this.vadHistoryIndex] = rms
        this.vadHistoryIndex = (this.vadHistoryIndex + 1) % this.vadHistory.length

        // Calculate average VAD confidence
        const avgVad = this.vadHistory.reduce((a, b) => a + b, 0) / this.vadHistory.length

        // Send audio only if voice activity detected
        if (avgVad > this.vadThreshold) {
          const audioData = new Int16Array(windowData)
          this.port.postMessage({
            type: 'audio',
            buffer: audioData.buffer
          })
        }
      }

      this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize
    }

    return true
  }
}

registerProcessor('audio-processor', AudioProcessor)

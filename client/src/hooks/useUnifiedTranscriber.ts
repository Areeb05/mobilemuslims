import { useState, useCallback, useEffect } from 'react';
import { useWebGPUTranscriber } from './useWebGPUTranscriber';
import { useWhisperModel } from './useWhisperModel';

// Type declarations for WASM stream API
declare global {
  interface Window {
    stream?: {
      init: (modelUrl: string, language: string) => number;
      set_audio: (streamId: number, audioData: Float32Array) => void;
      get_transcribed: () => string;
      get_status: () => string;
      set_status: (status: string) => void;
      free: (streamId: number) => void;
    };
  }
}

export interface UnifiedTranscriptionResult {
  text: string;
  chunks: { text: string; timestamp: [number, number | null] }[];
  language?: string;
  backend: 'webgpu' | 'wasm' | 'cloud';
  model: string;
}

export interface UnifiedTranscriber {
  transcribe: (audioBlob: Blob) => Promise<UnifiedTranscriptionResult>;
  loadModel: (modelName: string) => Promise<void>;
  isReady: boolean;
  isLoading: boolean;
  backend: 'webgpu' | 'wasm' | 'cloud';
  currentModel: string | null;
  availableModels: string[];
}

export function useUnifiedTranscriber(): UnifiedTranscriber {
  const webgpuTranscriber = useWebGPUTranscriber();
  const wasmModels = useWhisperModel();

  const [backend, setBackend] = useState<'webgpu' | 'wasm' | 'cloud'>('cloud');
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  // Determine the best available backend on mount
  useEffect(() => {
    const detectBestBackend = () => {
      if (webgpuTranscriber.isWebGPUAvailable) {
        setBackend('webgpu');
      } else if (window.stream?.init) {
        setBackend('wasm');
      } else {
        setBackend('cloud');
      }
    };

    detectBestBackend();
  }, [webgpuTranscriber.isWebGPUAvailable]);

  const loadModel = useCallback(async (modelName: string) => {
    try {
      if (backend === 'webgpu' && webgpuTranscriber.isWebGPUAvailable) {
        // For WebGPU, load ONNX model directly from transformers.js
        await webgpuTranscriber.loadModel(modelName.replace('-wasm', ''));
        setCurrentModel(modelName);
      } else if (backend === 'wasm') {
        // For WASM, load ggml model via our existing system
        const wasmModelName = modelName.includes('-wasm') ? modelName : `${modelName}-wasm`;
        await wasmModels.downloadModel(wasmModelName);
        setCurrentModel(wasmModelName);
      } else {
        // Cloud fallback - no model loading needed
        setCurrentModel(modelName);
      }
    } catch (error) {
      console.error(`Failed to load model ${modelName} for ${backend}:`, error);
      // Try fallback to next best backend
      if (backend === 'webgpu') {
        console.log('WebGPU failed, falling back to WASM');
        setBackend('wasm');
        await loadModel(modelName);
      } else if (backend === 'wasm') {
        console.log('WASM failed, falling back to cloud');
        setBackend('cloud');
        setCurrentModel(modelName);
      }
    }
  }, [backend, webgpuTranscriber, wasmModels]);

  const transcribe = useCallback(async (audioBlob: Blob): Promise<UnifiedTranscriptionResult> => {
    try {
      if (backend === 'webgpu' && webgpuTranscriber.isWebGPUAvailable && currentModel) {
        const result = await webgpuTranscriber.transcribe(audioBlob, {
          language: 'ar',
          task: 'transcribe'
        });

        return {
          ...result,
          backend: 'webgpu',
          model: currentModel
        };
      }

      if (backend === 'wasm' && currentModel && window.stream?.set_audio) {
        // WASM implementation - convert blob to audio and transcribe
        return new Promise((resolve, reject) => {
          // Convert blob to audio data for WASM
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioBlob.arrayBuffer().then(buffer => {
            return audioContext.decodeAudioData(buffer);
          }).then(audioBuffer => {
            // Get mono channel
            const audioData = audioBuffer.numberOfChannels > 1
              ? mixChannelsToMono(audioBuffer)
              : audioBuffer.getChannelData(0);

            // Send to WASM transcriber
            if (window.stream?.set_audio && window.stream?.get_transcribed) {
              window.stream.set_audio(1, audioData); // Assume stream ID 1

              // Wait for transcription result
              const checkTranscription = () => {
                const transcribed = window.stream?.get_transcribed();
                if (transcribed) {
                  resolve({
                    text: transcribed,
                    chunks: [{ text: transcribed, timestamp: [0, null] }],
                    backend: 'wasm',
                    model: currentModel
                  });
                } else {
                  setTimeout(checkTranscription, 100);
                }
              };

              setTimeout(checkTranscription, 100);
            } else {
              reject(new Error('WASM stream not available'));
            }
          }).catch(reject);
        });
      }

      // Cloud fallback - use Google Speech API
      throw new Error('Cloud transcription not implemented - use existing Google API integration');

    } catch (error) {
      console.error(`Transcription failed with ${backend}:`, error);

      // Try fallback backends
      if (backend === 'webgpu') {
        console.log('WebGPU transcription failed, trying WASM fallback');
        setBackend('wasm');
        return transcribe(audioBlob);
      } else if (backend === 'wasm') {
        console.log('WASM transcription failed, using cloud fallback');
        setBackend('cloud');
        // Return mock result for now
        return {
          text: '[Cloud transcription not available - demo mode]',
          chunks: [],
          backend: 'cloud',
          model: currentModel || 'unknown'
        };
      }

      throw error;
    }
  }, [backend, webgpuTranscriber, currentModel]);

  const availableModels = backend === 'webgpu'
    ? ['tiny', 'base', 'small']
    : backend === 'wasm'
    ? ['tiny-wasm', 'base-wasm', 'small-wasm']
    : ['cloud-fallback'];

  return {
    transcribe,
    loadModel,
    isReady: currentModel !== null,
    isLoading: webgpuTranscriber.isLoading || wasmModels.models.some(m => m.downloading),
    backend,
    currentModel,
    availableModels
  };
}

// Helper function to mix stereo audio to mono
function mixChannelsToMono(audioBuffer: AudioBuffer): Float32Array {
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);
  const monoData = new Float32Array(audioBuffer.length);

  const SCALING_FACTOR = Math.sqrt(2);

  for (let i = 0; i < audioBuffer.length; i++) {
    monoData[i] = (SCALING_FACTOR * (leftChannel[i] + rightChannel[i])) / 2;
  }

  return monoData;
}
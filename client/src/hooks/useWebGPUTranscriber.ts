import { useState, useCallback, useRef } from 'react';

// Type definitions for WebGPU support
declare global {
  interface Navigator {
    gpu?: any;
  }
}

interface TranscriptionResult {
  text: string;
  chunks: { text: string; timestamp: [number, number | null] }[];
  language?: string;
}

interface ProgressCallback {
  (progress: { loaded: number; total: number; progress: number }): void;
}

export interface WebGPUTranscriber {
  loadModel: (modelName: string, onProgress?: ProgressCallback) => Promise<void>;
  transcribe: (audioBlob: Blob, options?: { language?: string; task?: 'transcribe' | 'translate' }) => Promise<TranscriptionResult>;
  isModelLoaded: (modelName: string) => boolean;
  unloadModel: (modelName: string) => void;
  isWebGPUAvailable: boolean;
  isLoading: boolean;
  currentModel: string | null;
}

// WebGPU availability check
export const isWebGPUAvailable = (): boolean => {
  return !!(navigator as any).gpu;
};

export function useWebGPUTranscriber(): WebGPUTranscriber {
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const transcriberRef = useRef<any>(null);
  const loadedModelsRef = useRef<Set<string>>(new Set());

  // Dynamic import to avoid bundling transformers.js unless WebGPU is available
  const loadTransformers = async () => {
    if (!isWebGPUAvailable()) {
      throw new Error('WebGPU is not available in this browser');
    }

    const { pipeline } = await import('@huggingface/transformers');
    return { pipeline };
  };

  const loadModel = useCallback(async (modelName: string, onProgress?: ProgressCallback) => {
    if (!isWebGPUAvailable()) {
      throw new Error('WebGPU is required for this transcriber');
    }

    if (loadedModelsRef.current.has(modelName)) {
      setCurrentModel(modelName);
      return;
    }

    setIsLoading(true);

    try {
      const { pipeline } = await loadTransformers();

      console.log(`Loading WebGPU Whisper model: ${modelName}`);

      // Load the ONNX model with WebGPU acceleration
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        `onnx-community/whisper-${modelName}`,
        {
          device: 'webgpu',           // Enable WebGPU acceleration
          dtype: 'fp16',              // Use half precision for better performance
          progress_callback: onProgress ? (progress: any) => {
            onProgress({
              loaded: progress.loaded || 0,
              total: progress.total || 100,
              progress: progress.progress || 0
            });
          } : undefined
        }
      );

      transcriberRef.current = transcriber;
      loadedModelsRef.current.add(modelName);
      setCurrentModel(modelName);

      console.log(`WebGPU model ${modelName} loaded successfully`);

    } catch (error) {
      console.error('Failed to load WebGPU model:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transcribe = useCallback(async (
    audioBlob: Blob,
    options: { language?: string; task?: 'transcribe' | 'translate' } = {}
  ): Promise<TranscriptionResult> => {
    if (!transcriberRef.current) {
      throw new Error('No model loaded. Call loadModel() first.');
    }

    if (!isWebGPUAvailable()) {
      throw new Error('WebGPU is not available');
    }

    console.log('Starting WebGPU transcription...');

    try {
      // Convert blob to audio buffer
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);

      // Get mono channel data (required for Whisper)
      const channelData = audioData.numberOfChannels > 1
        ? mixChannelsToMono(audioData)
        : audioData.getChannelData(0);

      // Run transcription with WebGPU acceleration
      const result = await transcriberRef.current(channelData, {
        language: options.language || 'ar',  // Default to Arabic
        task: options.task || 'transcribe',
        return_timestamps: true,  // Enable timestamp chunks
      });

      console.log('WebGPU transcription completed:', result);

      // Format result to match our interface
      const formattedResult: TranscriptionResult = {
        text: result.text || '',
        chunks: result.chunks || [],
        language: result.language
      };

      return formattedResult;

    } catch (error) {
      console.error('WebGPU transcription failed:', error);
      throw error;
    }
  }, []);

  const isModelLoaded = useCallback((modelName: string): boolean => {
    return loadedModelsRef.current.has(modelName);
  }, []);

  const unloadModel = useCallback((modelName: string) => {
    loadedModelsRef.current.delete(modelName);
    if (currentModel === modelName) {
      setCurrentModel(null);
      transcriberRef.current = null;
    }
  }, [currentModel]);

  return {
    loadModel,
    transcribe,
    isModelLoaded,
    unloadModel,
    isWebGPUAvailable: isWebGPUAvailable(),
    isLoading,
    currentModel
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
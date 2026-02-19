import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Volume2, Maximize2, X, Settings, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useUnifiedTranscriber } from '../hooks/useUnifiedTranscriber';

// Translation dictionary for common Islamic phrases
const ISLAMIC_TRANSLATIONS: Record<string, string> = {
  'السلام عليكم': 'Peace be upon you',
  'الحمد لله': 'Praise be to Allah',
  'الله أكبر': 'Allah is the Greatest',
  'سبحان الله': 'Glory be to Allah',
  'لا إله إلا الله': 'There is no god but Allah',
  'اللهم صل على محمد': 'O Allah, send blessings upon Muhammad',
  'رب اغفر لي': 'Lord forgive me',
  'استغفر الله': 'I seek forgiveness from Allah',
  'بسم الله': 'In the name of Allah',
  'الحمد لله رب العالمين': 'All praise is due to Allah, Lord of the worlds'
};

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
    whisper: any;
  }
}

interface StreamUnderstandSalahProps {}

export default function StreamUnderstandSalah({}: StreamUnderstandSalahProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [status, setStatus] = useState('Detecting best backend...');
  const [selectedModel, setSelectedModel] = useState('tiny');
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<'arabic' | 'english' | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Unified transcriber with automatic backend selection
  const unifiedTranscriber = useUnifiedTranscriber();

  // Available models for UI display (based on detected backend)
  const availableModels = unifiedTranscriber.backend === 'webgpu' ? [
    { id: 'tiny', name: 'Tiny ONNX (WebGPU)', size: '39 MB' },
    { id: 'base', name: 'Base ONNX (WebGPU)', size: '74 MB' },
    { id: 'small', name: 'Small ONNX (WebGPU)', size: '244 MB' }
  ] : unifiedTranscriber.backend === 'wasm' ? [
    { id: 'tiny-wasm', name: 'Tiny WASM', size: '39 MB' },
    { id: 'base-wasm', name: 'Base WASM', size: '74 MB' },
    { id: 'small-wasm', name: 'Small WASM', size: '244 MB' }
  ] : [
    { id: 'cloud', name: 'Cloud Fallback', size: 'N/A' }
  ];

  const loadModel = useCallback(async (modelName: string) => {
    try {
      setStatus(`Loading ${modelName} model (${unifiedTranscriber.backend} backend)...`);
      await unifiedTranscriber.loadModel(modelName);
      setSelectedModel(modelName);
      setStatus(`Model loaded successfully - Ready to record! (${unifiedTranscriber.backend})`);
      console.log(`Model ${modelName} loaded successfully with ${unifiedTranscriber.backend} backend`);
    } catch (error) {
      console.error('Error loading model:', error);
      setStatus('Error loading model - check console for details');
    }
  }, [unifiedTranscriber]);

  // Auto-load the best available model
  const autoLoadBestModel = useCallback(async () => {
    try {
      // Choose the best model based on backend and device capabilities
      const bestModel = unifiedTranscriber.backend === 'webgpu' ? 'tiny' :
                       unifiedTranscriber.backend === 'wasm' ? 'tiny-wasm' : 'cloud';

      console.log(`Auto-loading ${bestModel} model with ${unifiedTranscriber.backend} backend`);
      setSelectedModel(bestModel);
      await loadModel(bestModel);
    } catch (error) {
      console.error('Error in auto-loading model:', error);
      setStatus('Error loading model');
    }
  }, [unifiedTranscriber.backend, loadModel]);

  // Auto-load best model when backend is ready
  useEffect(() => {
    if (unifiedTranscriber.backend !== 'cloud') {
      console.log(`Backend detected: ${unifiedTranscriber.backend}`);
      setStatus(`Initializing ${unifiedTranscriber.backend} backend...`);
      autoLoadBestModel();
    }
  }, [unifiedTranscriber.backend, autoLoadBestModel]);

  // Legacy WASM loading (for fallback)
  useEffect(() => {
    if (unifiedTranscriber.backend === 'wasm') {
      const loadWasmScript = async () => {
        try {
          const script = document.createElement('script');
          script.src = '/whisper/stream/libstream.js';
          script.onload = () => {
            console.log('Stream.wasm loaded as fallback');
          };
          script.onerror = (error) => {
            console.error('Failed to load stream.wasm fallback:', error);
          };
          document.head.appendChild(script);
        } catch (error) {
          console.error('Error loading WASM fallback:', error);
        }
      };
      loadWasmScript();
    }

    return () => {
      // Cleanup
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [unifiedTranscriber.backend]);

  // Status polling
  useEffect(() => {
    if (window.stream?.get_status && window.stream?.get_transcribed) {
      statusIntervalRef.current = setInterval(() => {
        try {
          const currentStatus = window.stream?.get_status?.();
          setStatus(currentStatus || 'Ready');

          // Get transcription updates
          const transcribed = window.stream?.get_transcribed?.();
          if (transcribed && transcribed !== transcription) {
            setTranscription(transcribed);
            // Translate the new transcription
            translateText(transcribed);
          }
        } catch (error) {
          // Ignore errors during status polling
        }
      }, 100);
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, [transcription]);

  const translateText = useCallback((arabicText: string) => {
    // First try exact matches in our dictionary
    if (ISLAMIC_TRANSLATIONS[arabicText.trim()]) {
      setTranslation(ISLAMIC_TRANSLATIONS[arabicText.trim()]);
      return;
    }

    // Try partial matches for longer phrases
    for (const [arabic, english] of Object.entries(ISLAMIC_TRANSLATIONS)) {
      if (arabicText.includes(arabic)) {
        setTranslation(english);
        return;
      }
    }

    // Fallback: Simple placeholder or API call
    setTranslation('[Translation not available in dictionary]');
  }, []);

  const startRecording = useCallback(async () => {
    if (!unifiedTranscriber.isReady) {
      setStatus('Please load a model first');
      return;
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      // Use MediaRecorder for reliable audio capture
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setStatus('Processing audio...');

          // Convert recorded chunks to a single blob
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

          // Use the unified transcriber
          const result = await unifiedTranscriber.transcribe(audioBlob);

          // Update UI with results
          setTranscription(result.text);
          setStatus(`Transcription complete (${result.backend} backend)`);

          console.log('Transcription result:', result);

        } catch (error) {
          console.error('Error processing recorded audio:', error);
          setStatus('Error processing audio');
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setStatus(`Recording with ${unifiedTranscriber.backend} backend... Speak now!`);

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Error accessing microphone');
    }
  }, [unifiedTranscriber]);

  const stopRecording = useCallback(() => {
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
    setStatus('Recording stopped');
  }, []);

  const clearTranscription = () => {
    setTranscription('');
    setTranslation('');
    if (window.stream && window.stream.set_status) {
      window.stream.set_status(''); // Clear transcribed text in WASM
    }
  };

  const toggleFullscreen = (mode: 'arabic' | 'english' | null) => {
    setFullscreenMode(mode);
  };

  // Fullscreen rendering
  if (fullscreenMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {fullscreenMode === 'arabic' ? 'Arabic Transcription' : 'English Translation'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFullscreen(null)}
            className="text-white hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div className="text-center">
            <p className={`text-3xl leading-relaxed ${
              fullscreenMode === 'arabic' ? 'font-arabic text-right' : ''
            }`}>
              {fullscreenMode === 'arabic' ? transcription : translation || 'No content yet...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-4 lg:p-6">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
          Stream Understand Salah
        </h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">
          Real-time Arabic speech-to-text using stream.wasm
        </p>

        {/* Status */}
        <div className="mt-3 space-y-2">
          <Badge variant="secondary" className={`${
            status.includes('Ready') || status.includes('loaded') || status.includes('complete') ? 'bg-green-600' :
            status.includes('Error') || status.includes('Failed') ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            {status}
          </Badge>
          <div className="text-xs text-gray-400">
            Backend: <span className="font-mono text-white">{unifiedTranscriber.backend.toUpperCase()}</span>
            {unifiedTranscriber.currentModel && (
              <> | Model: <span className="font-mono text-white">{unifiedTranscriber.currentModel}</span></>
            )}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <Card className="mb-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Audio Processing</span>
            <div className="flex gap-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Models
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Whisper Model Selection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Choose a model for Arabic speech recognition. Larger models are more accurate but slower.
                    </p>

                    <div className="space-y-3">
                      {availableModels.map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-gray-400">{model.size}</div>
                            </div>
                            {selectedModel === model.id && (
                              <Badge className="bg-blue-600">Active</Badge>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => loadModel(model.id)}
                            disabled={unifiedTranscriber.isLoading || status.includes('Loading')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
                      <p><strong>Note:</strong> Arabic works best with multilingual models (without .en suffix).</p>
                      <p>For production, host models on a CDN for faster loading.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={clearTranscription}
                variant="outline"
                size="sm"
                disabled={!transcription}
              >
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={!unifiedTranscriber.isReady}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 disabled:opacity-50"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Streaming
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3"
                size="lg"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Streaming
              </Button>
            )}

            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400">Live transcription active</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcription Display */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Arabic Transcription */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Arabic Transcription
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFullscreen('arabic')}
                disabled={!transcription}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 bg-gray-800 rounded border font-mono text-right">
              {transcription || 'Start streaming to see live Arabic transcription...'}
            </div>
          </CardContent>
        </Card>

        {/* English Translation */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>English Translation</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFullscreen('english')}
                disabled={!translation}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 bg-gray-800 rounded border font-mono">
              {translation || 'Translation will appear here...'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Powered by stream.wasm - Real-time Whisper transcription</p>
        <p className="mt-1">Arabic speech recognition with instant English translation</p>
      </div>
    </div>
  );
}
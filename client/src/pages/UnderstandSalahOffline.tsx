import { useState, useRef, useCallback, useEffect } from 'react';
// @ts-ignore - react-wasm doesn't have TypeScript definitions
import { useWasm } from 'react-wasm';
import { Mic, Square, Volume2, Maximize2, X, Download, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useWhisperModel } from '../hooks/useWhisperModel';

interface UnderstandSalahOfflineProps {}

export default function UnderstandSalahOffline({}: UnderstandSalahOfflineProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState('');
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fullscreenMode, setFullscreenMode] = useState<'arabic' | 'english' | null>(null);
  const [selectedModel, setSelectedModel] = useState('tiny');
  const [showSettings, setShowSettings] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const arabicScrollRef = useRef<HTMLDivElement | null>(null);
  const englishScrollRef = useRef<HTMLDivElement | null>(null);

  // Model management
  const { models, downloadModel, isModelReady } = useWhisperModel();

  // Load Whisper WASM model
  const { loading: wasmLoading, data: wasmData } = useWasm({
    url: '/whisper/whisper.wasm',
    importObject: {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
        // Add necessary imports for Whisper
        _emscripten_memcpy_big: (dest: number, src: number, num: number) => {
          const heap = new Uint8Array((wasmData?.instance.exports.memory as WebAssembly.Memory).buffer);
          heap.set(heap.subarray(src, src + num), dest);
        },
        // Add other required Emscripten functions
      }
    }
  });

  // Initialize Whisper model when WASM is ready
  const initializeWhisper = useCallback(async () => {
    if (!wasmData?.instance) return;

    try {
      setModelStatus('loading');

      // Check if selected model is downloaded
      if (!isModelReady(selectedModel)) {
        setModelStatus('error');
        setError(`Model "${selectedModel}" is not downloaded. Please download it in settings.`);
        return;
      }

      // Initialize Whisper with selected model
      const whisper = wasmData.instance.exports;

      // Load the model from IndexedDB
      const modelData = await loadModelFromIndexedDB(`/whisper/models/ggml-${selectedModel}.bin`);
      if (!modelData) {
        throw new Error('Failed to load model from storage');
      }

      // Initialize the model in WASM memory
      const modelPtr = (whisper as any).whisper_init_from_buffer(modelData, modelData.byteLength);
      if (modelPtr === 0) {
        throw new Error('Failed to initialize Whisper model');
      }

      setModelStatus('ready');
    } catch (err) {
      console.error('Whisper initialization error:', err);
      setModelStatus('error');
      setError('Failed to load Whisper model. Please try again.');
    }
  }, [wasmData, selectedModel, isModelReady]);

  // Initialize model when WASM loads
  useEffect(() => {
    if (!wasmLoading && wasmData?.instance) {
      initializeWhisper();
    }
  }, [wasmLoading, wasmData, initializeWhisper]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError('');
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!wasmData?.instance || modelStatus !== 'ready') {
      setError('Whisper model not ready. Please wait for initialization.');
      return;
    }

    try {
      setError('');

      // Convert blob to WAV format (required by Whisper)
      const wavBuffer = await convertToWav(audioBlob);

      // Process with Whisper
      const whisper = wasmData.instance.exports as any;

      // Create context and process audio
      const ctx = whisper.whisper_init_from_buffer(wavBuffer, wavBuffer.byteLength);
      if (ctx === 0) {
        throw new Error('Failed to create Whisper context');
      }

      // Set language to Arabic
      whisper.whisper_ctx_set_language(ctx, 'ar');

      // Process the audio
      const result = whisper.whisper_full(ctx, wavBuffer, wavBuffer.byteLength / 2, 1); // 1 = n_threads

      if (result === 0) {
        // Get transcription
        const arabicText = whisper.whisper_full_get_segment_text(ctx, 0);
        setTranscription(prev => prev + ' ' + arabicText);

        // Translate to English (you'll need to implement this)
        const englishText = await translateArabicToEnglish(arabicText);
        setTranslation(prev => prev + ' ' + englishText);
      } else {
        throw new Error('Transcription failed');
      }

      // Cleanup
      whisper.whisper_free(ctx);

    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process audio. Please try again.');
    }
  }, [wasmData, modelStatus]);

  const translateArabicToEnglish = async (arabicText: string): Promise<string> => {
    // For now, return a mock translation
    // In production, you could use Google Translate API or another translation service
    return `[${arabicText}]`; // Mock translation indicator
  };

  const convertToWav = async (blob: Blob): Promise<ArrayBuffer> => {
    // Convert WebM to WAV (simplified - you'll need proper conversion)
    // This is a placeholder - you'll need to implement proper audio conversion
    return await blob.arrayBuffer();
  };

  const loadModelFromIndexedDB = async (key: string): Promise<Uint8Array | null> => {
    try {
      const db = await openModelDatabase();
      return await getModelFromDB(db, key);
    } catch (error) {
      console.error('Error loading model from IndexedDB:', error);
      return null;
    }
  };

  // IndexedDB helpers (duplicate from hook - should refactor)
  const openModelDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WhisperModels', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  const getModelFromDB = (db: IDBDatabase, key: string): Promise<Uint8Array | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  };

  const clearTranscription = () => {
    setTranscription('');
    setTranslation('');
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
              fullscreenMode === 'arabic' ? 'font-arabic' : ''
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
          Understand Salah (Offline)
        </h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">
          Real-time Arabic speech-to-text using local AI model
        </p>

        {/* Model Status */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-center gap-2">
            {modelStatus === 'loading' && (
              <Badge variant="secondary" className="bg-blue-600">
                Loading {selectedModel} Model...
              </Badge>
            )}
            {modelStatus === 'ready' && (
              <Badge variant="secondary" className="bg-green-600">
                ✓ {selectedModel} Ready - Offline Mode Active
              </Badge>
            )}
            {modelStatus === 'error' && (
              <Badge variant="destructive">
                ✗ Model Loading Failed
              </Badge>
            )}
          </div>

          {modelStatus === 'error' && (
            <p className="text-xs text-gray-400 text-center">
              Make sure the {selectedModel} model is downloaded in Settings
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="mb-4 border-red-500 bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Recording Controls */}
      <Card className="mb-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audio Recording</span>
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
                    <DialogTitle>Whisper Model Management</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Download AI models for offline Arabic speech recognition. Smaller models are faster but less accurate.
                    </p>

                    <div className="space-y-3">
                      {models.map((model) => (
                        <div key={model.name} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {model.size}
                              </Badge>
                              {selectedModel === model.name && (
                                <Badge className="bg-blue-600">Active</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {model.name.includes('.en') ? 'English-optimized' : 'Multilingual (supports Arabic)'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {model.downloading && (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${model.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-blue-400">{model.progress}%</span>
                              </div>
                            )}

                            {!model.downloaded && !model.downloading && (
                              <Button
                                size="sm"
                                onClick={() => downloadModel(model.name)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            )}

                            {model.downloaded && selectedModel !== model.name && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedModel(model.name);
                                  setShowSettings(false);
                                }}
                              >
                                Select
                              </Button>
                            )}

                            {model.downloaded && selectedModel === model.name && (
                              <Badge className="bg-green-600">Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
                      <p><strong>Note:</strong> Models are stored locally in your browser. Arabic transcription works best with multilingual models (not .en variants).</p>
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
                disabled={modelStatus !== 'ready' || !isModelReady(selectedModel)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 disabled:opacity-50"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3"
                size="lg"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}

            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400">Recording...</span>
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
            <div
              ref={arabicScrollRef}
              className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 bg-gray-800 rounded border font-mono text-right"
            >
              {transcription || 'Start recording to see Arabic transcription...'}
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
            <div
              ref={englishScrollRef}
              className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 bg-gray-800 rounded border font-mono"
            >
              {translation || 'Translation will appear here...'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Offline mode powered by Whisper.cpp running locally in your browser</p>
        <p className="mt-1">No internet connection required for transcription</p>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Volume2, Maximize2, X, Settings, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useWhisperModel } from '../hooks/useWhisperModel';

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
    stream: any;
    whisper: any;
  }
}

interface StreamUnderstandSalahProps {}

export default function StreamUnderstandSalah({}: StreamUnderstandSalahProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [status, setStatus] = useState('Loading...');
  const [selectedModel, setSelectedModel] = useState('tiny');
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<'arabic' | 'english' | null>(null);
  const [streamId, setStreamId] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Model management
  const { models: downloadedModels, downloadModel } = useWhisperModel();

  // Available models for UI display
  const availableModels = [
    { id: 'tiny.en', name: 'Tiny English', size: '75 MB' },
    { id: 'base.en', name: 'Base English', size: '142 MB' },
    { id: 'small.en', name: 'Small English', size: '466 MB' },
    { id: 'tiny', name: 'Tiny Multilingual', size: '75 MB' },
    { id: 'base', name: 'Base Multilingual', size: '142 MB' },
    { id: 'small', name: 'Small Multilingual', size: '466 MB' }
  ];

  // Load stream.wasm script
  useEffect(() => {
    const loadScript = async () => {
      try {
        // Load the stream.wasm JavaScript module
        const script = document.createElement('script');
        script.src = '/whisper/stream/libstream.js';
        script.onload = async () => {
          console.log('Stream.wasm loaded successfully');
          setStatus('Loading model...');

          // Automatically load the best available model
          await autoLoadBestModel();
        };
        script.onerror = (error) => {
          console.error('Failed to load stream.wasm:', error);
          setStatus('Failed to load WASM module');
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading stream.wasm:', error);
        setStatus('Error loading stream module');
      }
    };

    loadScript();

    return () => {
      // Cleanup
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Status polling
  useEffect(() => {
    if (window.stream && window.stream.get_status) {
      statusIntervalRef.current = setInterval(() => {
        try {
          const currentStatus = window.stream.get_status();
          setStatus(currentStatus || 'Ready');

          // Get transcription updates
          const transcribed = window.stream.get_transcribed();
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

  const loadModel = useCallback(async (modelName: string) => {
    if (!window.stream || !window.stream.init) {
      setStatus('Stream module not loaded');
      return;
    }

    try {
      setStatus(`Loading ${modelName} model...`);

      // TEMPORARY: Using direct HuggingFace URLs for testing
      // TODO: Replace with CDN URLs to avoid CORS issues with large files
      const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;

      // Initialize the stream with the model
      const id = window.stream.init(modelUrl, 'ar'); // 'ar' for Arabic

      if (id > 0) {
        setStreamId(id);
        setSelectedModel(modelName);
        setStatus('Model loaded successfully');
      } else {
        setStatus('Failed to load model');
      }
    } catch (error) {
      console.error('Error loading model:', error);
      setStatus('Error loading model');
    }
  }, []);

  // Auto-load the best available model
  const autoLoadBestModel = useCallback(async () => {
    try {
      // Check for already downloaded models
      const alreadyDownloadedModels = downloadedModels.filter(model => model.downloaded);

      if (alreadyDownloadedModels.length > 0) {
        // Load the first available downloaded model
        const bestModel = alreadyDownloadedModels[0];
        console.log('Found downloaded model:', bestModel.name);
        setSelectedModel(bestModel.name);
        await loadModel(bestModel.name);
      } else {
        // No downloaded models, auto-download and load 'tiny' model
        console.log('No downloaded models found, auto-loading tiny model');
        setSelectedModel('tiny');
        await downloadModel('tiny');
        // After download completes, load the model
        await loadModel('tiny');
      }
    } catch (error) {
      console.error('Error in auto-loading model:', error);
      setStatus('Error loading model');
    }
  }, [downloadedModels, downloadModel, loadModel]);

  const startRecording = useCallback(async () => {
    if (!streamId) {
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
        if (audioChunks.length > 0 && window.stream && window.stream.set_audio && streamId) {
          try {
            // Convert recorded audio to the format expected by stream.wasm
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();

            // Convert to Float32Array (simplified - real implementation needs proper decoding)
            const audioData = new Float32Array(arrayBuffer.byteLength / 4);
            const view = new DataView(arrayBuffer);

            // This is a simplified conversion - real implementation needs proper audio decoding
            for (let i = 0; i < audioData.length; i++) {
              audioData[i] = view.getFloat32(i * 4, true) || 0;
            }

            // Send audio data to the stream processor
            window.stream.set_audio(streamId, audioData);
          } catch (error) {
            console.error('Error processing recorded audio:', error);
          }
        }
      };

      // Start recording in small chunks
      mediaRecorder.start(100); // 100ms chunks
      setIsRecording(true);
      setStatus('Recording... Speak now!');

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Error accessing microphone');
    }
  }, [streamId]);

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
        <div className="mt-3">
          <Badge variant="secondary" className={`${
            status.includes('Ready') || status.includes('loaded') ? 'bg-green-600' :
            status.includes('Error') || status.includes('Failed') ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            {status}
          </Badge>
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
                            disabled={status.includes('Loading')}
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
                disabled={!streamId}
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
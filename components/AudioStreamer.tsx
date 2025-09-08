'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Mic, Square, Maximize2, Minimize } from 'lucide-react';

interface AudioStreamerProps {
  endpoint?: string;
}

export function AudioStreamer({ endpoint = '/api/stream' }: AudioStreamerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState('');
  const [isTranscriptionFullscreen, setIsTranscriptionFullscreen] = useState(false);
  const [isTranslationFullscreen, setIsTranslationFullscreen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptionRef = useRef<HTMLDivElement | null>(null);
  const translationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection with dynamic URL for deployment
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    console.log('Attempting to connect to Socket.IO at:', socketUrl);
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
    });

    // Socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO server at:', socketUrl);
      setError('');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setError('Connection failed: ' + err.message);
    });

    socketRef.current.on('transcription', (data: string) => {
      setTranscription(data);
    });

    socketRef.current.on('translation', (data: string) => {
      setTranslation(data);
    });

    socketRef.current.on('error', (err: string) => {
      setError(err);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server. Reason:', reason);
      setError('Disconnected from server: ' + reason);
      stopRecording();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      stopRecording();
      exitFullscreen();
    };
  }, [endpoint]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);

      // Use Web Audio API for audio processing with downsampling
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorNodeRef.current.onaudioprocess = (event: AudioProcessingEvent) => {
        const audioData = event.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
        }
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('audio', int16Array.buffer);
        }
      };

      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + (err instanceof Error ? err.message : String(err)));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleFullscreen = (section: 'transcription' | 'translation') => {
    if (section === 'transcription') {
      setIsTranscriptionFullscreen(!isTranscriptionFullscreen);
      if (!isTranscriptionFullscreen && transcriptionRef.current) {
        transcriptionRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
          setError('Failed to enter fullscreen mode: ' + err.message);
        });
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        setIsTranscriptionFullscreen(false);
      }
    } else {
      setIsTranslationFullscreen(!isTranslationFullscreen);
      if (!isTranslationFullscreen && translationRef.current) {
        translationRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
          setError('Failed to enter fullscreen mode: ' + err.message);
        });
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        setIsTranslationFullscreen(false);
      }
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsTranscriptionFullscreen(false);
    setIsTranslationFullscreen(false);
  };

  return (
    <div className="flex flex-col gap-4 p-6 max-w-2xl mx-auto">
      <Button
        onClick={toggleRecording}
        className="flex items-center justify-center gap-2"
        variant={isRecording ? 'destructive' : 'default'}
      >
        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>

      {error && (
        <div className="text-red-500 text-sm mt-2">Error: {error}</div>
      )}

      <div className="mt-4 space-y-4">
        <div ref={transcriptionRef} className={`bg-gray-50 p-4 rounded-md shadow-sm ${isTranscriptionFullscreen ? 'fixed inset-0 bg-gray-50 flex flex-col z-50' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-700">Transcription (Arabic)</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => toggleFullscreen('transcription')} 
              className="p-1 h-8"
            >
              {isTranscriptionFullscreen ? <Minimize className="h-4 w-4 text-gray-700" /> : <Maximize2 className="h-4 w-4 text-gray-700" />}
            </Button>
          </div>
          <p className={`text-base text-gray-900 mt-2 whitespace-pre-wrap ${isTranscriptionFullscreen ? 'text-2xl overflow-auto p-4 flex-1' : ''}`}>{transcription || 'Waiting for speech...'}</p>
        </div>

        <div ref={translationRef} className={`bg-blue-50 p-4 rounded-md shadow-sm ${isTranslationFullscreen ? 'fixed inset-0 bg-blue-50 flex flex-col z-50' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-blue-700">Translation (English)</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => toggleFullscreen('translation')} 
              className="p-1 h-8"
            >
              {isTranslationFullscreen ? <Minimize className="h-4 w-4 text-blue-700" /> : <Maximize2 className="h-4 w-4 text-blue-700" />}
            </Button>
          </div>
          <p className={`text-base text-blue-900 mt-2 whitespace-pre-wrap ${isTranslationFullscreen ? 'text-2xl overflow-auto p-4 flex-1' : ''}`}>{translation || 'Waiting for translation...'}</p>
        </div>
      </div>
    </div>
  );
} 
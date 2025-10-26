'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Users, Wifi, WifiOff, Volume2 } from 'lucide-react';

interface MosqueAudioStreamerProps {
  roomCode: string;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export function MosqueAudioStreamer({ roomCode, onStatusChange }: MosqueAudioStreamerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [participants, setParticipants] = useState(0);
  const [error, setError] = useState('');
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    console.log('Connecting to Socket.IO at:', socketUrl);
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setConnectionStatus('connected');
      onStatusChange?.('connected');
      setError('');

      // Create room when connected
      socket.emit('create-room', {
        roomCode: roomCode,
        languages: ['en', 'fr', 'de', 'es', 'tr', 'ur', 'bn', 'hi']
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setConnectionStatus('disconnected');
      onStatusChange?.('disconnected');
      setError('Connection failed: ' + err.message);
    });

    socket.on('room-created', (data) => {
      console.log('Room created:', data);
      setParticipants(data.participants || 0);
    });

    socket.on('participant-joined', (data) => {
      console.log('Participant joined:', data);
      setParticipants(data.totalParticipants);
    });

    socket.on('participant-left', (data) => {
      console.log('Participant left:', data);
      setParticipants(data.remainingParticipants);
    });

    socket.on('transcription', (data: string) => {
      setTranscription(data);
    });

    socket.on('translation', (data: string) => {
      setTranslation(data);
    });

    socket.on('error', (err: string) => {
      setError(err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server. Reason:', reason);
      setConnectionStatus('disconnected');
      onStatusChange?.('disconnected');
      setError('Disconnected from server: ' + reason);
      stopStreaming();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      stopStreaming();
    };
  }, [roomCode, onStatusChange]);

  const startStreaming = async () => {
    if (!socketRef.current || connectionStatus !== 'connected') {
      setError('Not connected to server');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      setIsStreaming(true);
      setError('');

      // Use Web Audio API for audio processing with downsampling
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorNodeRef.current.onaudioprocess = (event: AudioProcessingEvent) => {
        const audioData = event.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
        }
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('mosque-audio', int16Array.buffer);
        }
      };

      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error('Error starting streaming:', err);
      setError('Failed to start streaming: ' + (err instanceof Error ? err.message : String(err)));
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);

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

  const toggleStreaming = () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
    }
  };

  return (
    <Card className="bg-midnight/50 border-gold/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gold flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Mosque Audio Stream
            </CardTitle>
            <CardDescription className="text-gray-300">
              Broadcast live audio to room {roomCode}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-gold/50 text-gold">
              <Users className="h-3 w-3 mr-1" />
              {participants} listening
            </Badge>
            <div className="flex items-center space-x-1">
              {connectionStatus === 'connected' && <Wifi className="h-4 w-4 text-green-500" />}
              {connectionStatus === 'disconnected' && <WifiOff className="h-4 w-4 text-red-500" />}
              <span className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleStreaming}
            disabled={connectionStatus !== 'connected'}
            className={`font-bold px-8 py-3 ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gold hover:bg-gold/90'
            } text-black`}
          >
            {isStreaming ? (
              <>
                <Square className="h-5 w-5 mr-2" />
                Stop Broadcasting
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Start Broadcasting
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Live Preview */}
        {isStreaming && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Arabic Transcription */}
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-gold font-semibold mb-2 flex items-center">
                <Mic className="h-4 w-4 mr-2" />
                Live Arabic Transcription
              </h3>
              <p className="text-white text-right font-arabic min-h-[60px]" dir="rtl">
                {transcription || 'Listening for speech...'}
              </p>
            </div>

            {/* English Translation */}
            <div className="bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                Live English Translation
              </h3>
              <p className="text-white min-h-[60px]">
                {translation || 'Translation will appear here...'}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isStreaming && (
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h3 className="text-gold font-semibold mb-2">Instructions:</h3>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>Ensure your microphone is positioned near the speaker or sound system</li>
              <li>Speak clearly and at normal volume</li>
              <li>Allow microphone permissions when prompted</li>
              <li>Translations will appear in real-time for all room participants</li>
            </ul>
          </div>
        )}

        {/* Room Code Display */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Share this code with attendees:</p>
          <code className="bg-rich-black/50 px-4 py-2 rounded text-gold font-mono text-lg">
            {roomCode}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

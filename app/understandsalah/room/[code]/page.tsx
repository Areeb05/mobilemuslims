'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Mic,
  Volume2,
  Maximize2,
  Minimize2,
  Settings,
  Globe,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import Link from 'next/link';

interface RoomParticipant {
  id: string;
  language: string;
  joinedAt: Date;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;

  const [isConnected, setIsConnected] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [roomInfo, setRoomInfo] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);

  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'ur', name: 'Urdu' },
    { code: 'bn', name: 'Bengali' },
    { code: 'hi', name: 'Hindi' },
  ];

  useEffect(() => {
    // Validate room code on mount
    if (!roomCode || !/^[A-Z0-9]{4,6}$/.test(roomCode)) {
      router.push('/understandsalah/join');
      return;
    }

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
      setIsConnected(true);

      // Join the room
      socket.emit('join-room', {
        roomCode: roomCode,
        language: selectedLanguage
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    });

    socket.on('room-joined', (data) => {
      console.log('Successfully joined room:', data);
      setRoomInfo(data);
      setParticipantCount(data.participants || 1);

      // Set initial transcription and translation if available
      if (data.transcription) {
        setTranscription(data.transcription);
      }
      if (data.translation) {
        setTranslation(data.translation);
      }
    });

    socket.on('transcription', (data: string) => {
      console.log('Received transcription:', data);
      setTranscription(data);
    });

    socket.on('translation', (data: string) => {
      console.log('Received translation:', data);
      setTranslation(data);
    });

    socket.on('participant-joined', (data) => {
      console.log('Participant joined:', data);
      setParticipantCount(data.totalParticipants);
    });

    socket.on('participant-left', (data) => {
      console.log('Participant left:', data);
      setParticipantCount(data.remainingParticipants);
    });

    socket.on('error', (err: string) => {
      console.error('Room error:', err);
      setConnectionStatus('disconnected');
      // You could show a toast notification here
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server. Reason:', reason);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomCode, router]);

  // Handle language change
  useEffect(() => {
    if (socketRef.current && isConnected) {
      // Notify server of language change (optional)
      socketRef.current.emit('language-change', {
        roomCode: roomCode,
        language: selectedLanguage
      });
    }
  }, [selectedLanguage, isConnected, roomCode]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0021] to-[#2B0014] text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/understandsalah" className="text-gold hover:text-gold/80">
              ← Back to Hub
            </Link>
            <div className="flex items-center space-x-2">
              <code className="bg-rich-black/50 px-3 py-1 rounded text-gold font-mono">
                {roomCode}
              </code>
              <div className="flex items-center space-x-1 text-sm text-gray-400">
                {getConnectionIcon()}
                <span>{getConnectionText()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-gold/20 text-gold">
              <Users className="h-3 w-3 mr-1" />
              {participantCount} connected
            </Badge>
          </div>
        </div>

        {/* Language Selection */}
        <Card className="bg-midnight/50 border-gold/20 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gold" />
                <span className="text-gray-300">Translation Language:</span>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-40 bg-rich-black/50 border-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-rich-black border-gold/20">
                    {availableLanguages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code} className="text-white">
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={toggleFullscreen}
                className="border-gold/50 text-gold hover:bg-gold/10"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Translation Display */}
        <div className={`grid gap-6 ${isFullscreen ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
          {/* Arabic Transcription */}
          <Card className={`bg-midnight/50 border-gold/20 ${isFullscreen ? 'order-2' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gold flex items-center">
                  <Mic className="h-5 w-5 mr-2" />
                  Arabic Transcription
                </CardTitle>
                <Badge variant="outline" className="border-gold/50 text-gold">
                  Live
                </Badge>
              </div>
              <CardDescription className="text-gray-400">
                Real-time speech-to-text from the mosque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`bg-rich-black/50 p-6 rounded-lg min-h-[200px] ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
                {connectionStatus === 'connecting' && (
                  <div className="flex items-center justify-center space-x-2 text-gray-400">
                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting to audio stream...</span>
                  </div>
                )}
                {connectionStatus === 'disconnected' && (
                  <div className="text-center text-red-400">
                    <WifiOff className="h-12 w-12 mx-auto mb-2" />
                    <p>Connection lost. Please refresh the page.</p>
                  </div>
                )}
                {connectionStatus === 'connected' && (
                  <p className="text-white leading-relaxed font-arabic text-right" dir="rtl">
                    {transcription || 'Listening for speech...'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Translation */}
          <Card className={`bg-blue-900/20 border-blue-500/20 ${isFullscreen ? 'order-1' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-400 flex items-center">
                  <Volume2 className="h-5 w-5 mr-2" />
                  {availableLanguages.find(l => l.code === selectedLanguage)?.name} Translation
                </CardTitle>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                  Live
                </Badge>
              </div>
              <CardDescription className="text-gray-400">
                Real-time translation in your selected language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`bg-rich-black/50 p-6 rounded-lg min-h-[200px] ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
                {connectionStatus === 'connecting' && (
                  <div className="flex items-center justify-center space-x-2 text-gray-400">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Preparing translation...</span>
                  </div>
                )}
                {connectionStatus === 'disconnected' && (
                  <div className="text-center text-red-400">
                    <WifiOff className="h-12 w-12 mx-auto mb-2" />
                    <p>Connection lost. Please refresh the page.</p>
                  </div>
                )}
                {connectionStatus === 'connected' && (
                  <p className="text-white leading-relaxed">
                    {translation || 'Translation will appear here...'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Info */}
        <Card className="bg-midnight/30 border-gold/20 mt-6">
          <CardHeader>
            <CardTitle className="text-gold">Room Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gold" />
                <span className="text-gray-400">Participants:</span>
                <span className="text-white">{participantCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gold" />
                <span className="text-gray-400">Joined:</span>
                <span className="text-white">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gold" />
                <span className="text-gray-400">Language:</span>
                <span className="text-white">
                  {availableLanguages.find(l => l.code === selectedLanguage)?.name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-midnight/30 border-gold/20 mt-6">
          <CardHeader>
            <CardTitle className="text-gold">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gold mb-2">For Best Experience:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Keep your device volume on</li>
                  <li>Ensure stable internet connection</li>
                  <li>Choose your preferred language above</li>
                  <li>Use fullscreen mode for better visibility</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gold mb-2">Need Help?</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check your room code is correct</li>
                  <li>Refresh if connection is lost</li>
                  <li>Contact mosque staff for assistance</li>
                  <li>Try switching languages if needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

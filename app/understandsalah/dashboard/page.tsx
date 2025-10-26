'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Mic,
  QrCode,
  Copy,
  Play,
  Square,
  Settings,
  Globe,
  Clock,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { MosqueAudioStreamer } from '@/components/MosqueAudioStreamer';

interface MosqueRoom {
  id: string;
  code: string;
  name: string;
  status: 'inactive' | 'active' | 'ended';
  participants: number;
  languages: string[];
  createdAt: Date;
}

export default function MosqueDashboard() {
  const [rooms, setRooms] = useState<MosqueRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

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

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const createRoom = () => {
    if (!newRoomName.trim()) return;

    const room: MosqueRoom = {
      id: Date.now().toString(),
      code: generateRoomCode(),
      name: newRoomName,
      status: 'inactive',
      participants: 0,
      languages: selectedLanguages,
      createdAt: new Date(),
    };

    setRooms(prev => [room, ...prev]);
    setNewRoomName('');
    setSelectedLanguages(['en']);
    setIsCreatingRoom(false);
  };

  const startRoom = (roomId: string) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, status: 'active' } : room
    ));
    setActiveRoom(roomId);
  };

  const endRoom = (roomId: string) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, status: 'ended' } : room
    ));
    setActiveRoom(null);
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0021] to-[#2B0014] text-white p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/understandsalah" className="text-gold hover:text-gold/80 mb-2 inline-block">
              ← Back to Hub
            </Link>
            <h1 className="text-4xl font-serif font-bold text-gold">Mosque Dashboard</h1>
            <p className="text-gray-300 mt-2">Create and manage translation rooms for your congregation</p>
          </div>
          <Button
            onClick={() => setIsCreatingRoom(true)}
            className="bg-gold hover:bg-gold/90 text-black font-bold"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Create Room Modal */}
        {isCreatingRoom && (
          <Card className="bg-midnight/50 border-gold/20 mb-8">
            <CardHeader>
              <CardTitle className="text-gold">Create New Translation Room</CardTitle>
              <CardDescription>
                Set up a room for your mosque's prayer session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomName" className="text-gray-300">Room Name</Label>
                <Input
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Friday Prayer - Masjid Al-Noor"
                  className="bg-rich-black/50 border-gold/20 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Translation Languages</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {availableLanguages.map(lang => (
                    <label key={lang.code} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLanguages(prev => [...prev, lang.code]);
                          } else {
                            setSelectedLanguages(prev => prev.filter(l => l !== lang.code));
                          }
                        }}
                        className="rounded border-gold/20"
                      />
                      <span className="text-sm text-gray-300">{lang.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={createRoom} className="bg-gold hover:bg-gold/90 text-black font-bold">
                  Create Room
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingRoom(false)}
                  className="border-gold/50 text-gold hover:bg-gold/10"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Room Streamer */}
        {activeRoom && (
          <div className="mb-8">
            <MosqueAudioStreamer
              roomCode={rooms.find(r => r.id === activeRoom)?.code || ''}
              onStatusChange={(status) => {
                if (status === 'disconnected') {
                  endRoom(activeRoom);
                }
              }}
            />
          </div>
        )}

        {/* Rooms List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-bold text-gold mb-6">Your Rooms</h2>

          {rooms.length === 0 ? (
            <Card className="bg-midnight/30 border-gold/20">
              <CardContent className="p-8 text-center">
                <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Rooms Created</h3>
                <p className="text-gray-500 mb-4">Create your first translation room to get started</p>
                <Button
                  onClick={() => setIsCreatingRoom(true)}
                  className="bg-gold hover:bg-gold/90 text-black font-bold"
                >
                  Create Your First Room
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rooms.map(room => (
                <Card key={room.id} className="bg-midnight/50 border-gold/20 hover:border-gold/40 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gold mb-1">{room.name}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {room.createdAt.toLocaleDateString()}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`}></div>
                          <span className="capitalize">{room.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="bg-rich-black/50 px-3 py-1 rounded text-gold font-mono">
                            {room.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyRoomCode(room.code)}
                            className="text-gold hover:bg-gold/10"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-400">{room.participants} participants</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gold/20 mb-4" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Languages:</span>
                        <div className="flex gap-1">
                          {room.languages.map(lang => (
                            <Badge key={lang} variant="secondary" className="bg-gold/20 text-gold">
                              {availableLanguages.find(l => l.code === lang)?.name || lang}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {room.status === 'inactive' && (
                          <Button
                            onClick={() => startRoom(room.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Session
                          </Button>
                        )}
                        {room.status === 'active' && (
                          <Button
                            onClick={() => endRoom(room.id)}
                            variant="destructive"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            End Session
                          </Button>
                        )}
                        <Link href={`/understandsalah/room/${room.code}`}>
                          <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Setup Guide */}
        <Card className="bg-midnight/30 border-gold/20 mt-8">
          <CardHeader>
            <CardTitle className="text-gold">Quick Setup Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-3">
                <div className="bg-gold/20 rounded-full p-2 mt-1">
                  <span className="text-gold font-bold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gold mb-1">Create Room</p>
                  <p className="text-gray-400">Set up a translation room with your preferred languages</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-gold/20 rounded-full p-2 mt-1">
                  <span className="text-gold font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gold mb-1">Share Code</p>
                  <p className="text-gray-400">Display the room code on mosque screens or share via QR code</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-gold/20 rounded-full p-2 mt-1">
                  <span className="text-gold font-bold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gold mb-1">Start Translation</p>
                  <p className="text-gray-400">Begin the session and attendees will receive live translations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

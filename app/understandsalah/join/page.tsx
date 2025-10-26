'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Users,
  QrCode,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Globe
} from 'lucide-react';
import Link from 'next/link';

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate room code format (4-6 alphanumeric characters)
      const codePattern = /^[A-Z0-9]{4,6}$/;
      if (!codePattern.test(roomCode.toUpperCase())) {
        throw new Error('Invalid room code format. Please use 4-6 letters and numbers.');
      }

      // Here you would typically make an API call to validate the room
      // For now, we'll simulate this with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If validation passes, redirect to the room
      setSuccess(true);
      setTimeout(() => {
        router.push(`/understandsalah/room/${roomCode.toUpperCase()}`);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room. Please check your code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleJoinRoom();
    }
  };

  const formatRoomCode = (code: string) => {
    // Auto-format to uppercase and limit length
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0021] to-[#2B0014] text-white p-6">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/understandsalah" className="text-gold hover:text-gold/80 mb-4 inline-block">
            ← Back to Hub
          </Link>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-4">
            Join Translation Session
          </h1>
          <p className="text-xl text-gray-300 max-w-xl mx-auto">
            Enter the room code from your mosque to receive live prayer translations
          </p>
        </div>

        {/* Main Join Card */}
        <Card className="bg-midnight/50 border-gold/20 mb-8">
          <CardHeader className="text-center">
            <Smartphone className="h-16 w-16 text-gold mx-auto mb-4" />
            <CardTitle className="text-2xl text-gold">Enter Room Code</CardTitle>
            <CardDescription className="text-gray-300">
              Get the code from your mosque's screen or staff
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Code Input */}
            <div className="space-y-2">
              <Label htmlFor="roomCode" className="text-gray-300 text-lg">
                Room Code
              </Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter 4-6 character code"
                className="text-center text-2xl font-mono tracking-widest bg-rich-black/50 border-gold/20 text-white h-16"
                maxLength={6}
                disabled={isLoading}
              />
              <p className="text-sm text-gray-400 text-center">
                Codes are 4-6 letters and numbers (e.g., A1B2 or 4928)
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Joining room... Redirecting...</span>
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoinRoom}
              disabled={isLoading || !roomCode.trim()}
              className="w-full bg-gold hover:bg-gold/90 text-black font-bold text-lg py-6"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Joining Room...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Join Translation Session</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-midnight/30 border-gold/20 mb-8">
          <CardHeader>
            <CardTitle className="text-gold text-center">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="bg-gold/20 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-gold" />
                </div>
                <h3 className="font-semibold text-gold">Get Code</h3>
                <p className="text-gray-400 text-sm">
                  Get the room code from your mosque's screen or staff member
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-gold/20 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-gold" />
                </div>
                <h3 className="font-semibold text-gold">Enter Code</h3>
                <p className="text-gray-400 text-sm">
                  Type the code above and join the live translation session
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-gold/20 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                  <Globe className="h-8 w-8 text-gold" />
                </div>
                <h3 className="font-semibold text-gold">Get Translations</h3>
                <p className="text-gray-400 text-sm">
                  Receive real-time translations in your preferred language
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Room Codes for Testing */}
        <Card className="bg-midnight/30 border-gold/20">
          <CardHeader>
            <CardTitle className="text-gold text-center">Testing Codes</CardTitle>
            <CardDescription className="text-center">
              For development and testing purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['TEST1', 'DEMO2', 'ROOM3', 'ABCD'].map(code => (
                <Button
                  key={code}
                  variant="outline"
                  onClick={() => setRoomCode(code)}
                  className="border-gold/50 text-gold hover:bg-gold/10 font-mono"
                >
                  {code}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Click any code above to auto-fill the input field
            </p>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-gray-400">
            Don't have a code? Ask your mosque staff to create a translation room.
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <Link href="/understandsalah" className="text-gold hover:text-gold/80">
              Back to Hub
            </Link>
            <span className="text-gray-500">•</span>
            <Link href="/understandsalah/dashboard" className="text-gold hover:text-gold/80">
              Create Room (Mosques)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

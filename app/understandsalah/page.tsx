'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Users, QrCode, Smartphone } from 'lucide-react';
import { AudioStreamer } from '@/components/AudioStreamer';

export default function UnderstandSalah() {
  const [selectedMode, setSelectedMode] = useState<'individual' | 'mosque' | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0021] to-[#2B0014] text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-4">
            Understand Salah
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real-time Arabic transcription and translation for prayer assistance
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Individual Mode */}
          <Card className="bg-midnight/50 border-gold/20 hover:border-gold/40 transition-all duration-300">
            <CardHeader className="text-center">
              <Mic className="h-12 w-12 text-gold mx-auto mb-4" />
              <CardTitle className="text-2xl text-gold">Individual Mode</CardTitle>
              <CardDescription className="text-gray-300">
                Personal transcription for your own prayer assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setSelectedMode('individual')}
                className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
              >
                Start Individual Session
              </Button>
            </CardContent>
          </Card>

          {/* Mosque Mode */}
          <Card className="bg-midnight/50 border-gold/20 hover:border-gold/40 transition-all duration-300">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-gold mx-auto mb-4" />
              <CardTitle className="text-2xl text-gold">Mosque Mode</CardTitle>
              <CardDescription className="text-gray-300">
                Create translation rooms for congregation members
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <Button
                onClick={() => setSelectedMode('mosque')}
                className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
              >
                Create Mosque Session
              </Button>
              <p className="text-sm text-gray-400">or</p>
              <Link href="/understandsalah/join">
                <Button variant="outline" className="w-full border-gold/50 text-gold hover:bg-gold/10">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Join Existing Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Selected Mode Content */}
        {selectedMode === 'individual' && (
          <Card className="bg-midnight/30 border-gold/20">
            <CardHeader>
              <CardTitle className="text-gold">Individual Transcription</CardTitle>
              <CardDescription>
                Use your microphone for personal Arabic transcription and translation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-rich-black/50 p-6 rounded-lg">
                <IndividualTranscriptionMode />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedMode === 'mosque' && (
          <Card className="bg-midnight/30 border-gold/20">
            <CardHeader>
              <CardTitle className="text-gold">Mosque Dashboard</CardTitle>
              <CardDescription>
                Create and manage translation rooms for your congregation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-rich-black/50 p-6 rounded-lg">
                <MosqueDashboardMode />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <QrCode className="h-8 w-8 text-gold mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gold mb-2">Easy Sharing</h3>
            <p className="text-gray-300 text-sm">Simple codes for attendees to join</p>
          </div>
          <div className="text-center">
            <Mic className="h-8 w-8 text-gold mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gold mb-2">Real-time Processing</h3>
            <p className="text-gray-300 text-sm">Live Arabic transcription and translation</p>
          </div>
          <div className="text-center">
            <Users className="h-8 w-8 text-gold mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gold mb-2">Scalable</h3>
            <p className="text-gray-300 text-sm">Support hundreds of attendees per session</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual Mode Component
function IndividualTranscriptionMode() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-gray-300 mb-4">
          Use your microphone for personal Arabic transcription and translation
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Make sure your microphone is enabled and speak clearly in Arabic
        </p>
      </div>

      {/* Use the existing AudioStreamer component */}
      <AudioStreamer />
    </div>
  );
}

// Mosque Dashboard Mode Component
function MosqueDashboardMode() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-gray-300 mb-4">
          Create a translation room for your mosque congregation
        </p>
        <Link href="/understandsalah/dashboard">
          <Button className="bg-gold hover:bg-gold/90 text-black font-bold">
            Go to Dashboard
          </Button>
        </Link>
      </div>
      <div className="bg-gray-800/50 p-4 rounded-lg">
        <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
          <div>
            <Users className="h-8 w-8 text-gold mx-auto mb-2" />
            <p className="text-gold font-semibold">Create Rooms</p>
            <p className="text-gray-400">Set up translation sessions</p>
          </div>
          <div>
            <QrCode className="h-8 w-8 text-gold mx-auto mb-2" />
            <p className="text-gold font-semibold">Share Codes</p>
            <p className="text-gray-400">Easy attendee access</p>
          </div>
          <div>
            <Mic className="h-8 w-8 text-gold mx-auto mb-2" />
            <p className="text-gold font-semibold">Live Translation</p>
            <p className="text-gray-400">Real-time processing</p>
          </div>
        </div>
      </div>
    </div>
  );
}

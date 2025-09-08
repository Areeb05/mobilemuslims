'use client';

import React from 'react';
import { AudioStreamer } from '@/components/AudioStreamer';

export default function UnderstandSalah() {
  return (
    <div className="container mx-auto p-6">
      <header className="text-lg font-semibold text-gray-600">
        Understand Salah: Real-Time Transcription
      </header>
      <h1 className="text-3xl font-bold mt-4">Listen and Understand</h1>
      <div className="mt-6">
        <AudioStreamer />
      </div>
    </div>
  );
}
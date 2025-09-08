import type { Server as WSServerType } from 'ws'; // Import type for TypeScript
const ws = require('ws'); // Runtime import for the ws module
import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import { v2 as cloudTranslate } from '@google-cloud/translate';
import { Server } from 'socket.io';

// Handle Google Cloud credentials from Replit secrets
let credentials = {};
try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log('Google Cloud credentials loaded from Replit secrets.');
  } else {
    console.warn('No Google Cloud credentials found in environment variables.');
  }
} catch (error) {
  console.error('Failed to parse Google Cloud credentials:', error);
}

// Initialize Google Cloud clients with credentials
const speechClient = new SpeechClient({ credentials });
const translateClient = new cloudTranslate.Translate({ credentials });

// Store WebSocket server instance with the correct type
let wss: WSServerType | null = null;
let io: Server | null = null;

export async function GET(req: NextRequest) {
  const { socket } = req as any; // Access raw socket (Next.js App Router)

  if (!io) {
    io = new Server(socket.server, {
      path: '/api/stream',
      cors: {
        origin: '*', // Allow any origin for now, adjust in production
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      let latestTranscription = '';
      let translationInterval: NodeJS.Timeout;

      const recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'ar-XA', // Modern Standard Arabic
          },
          interimResults: true,
        })
        .on('data', (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            latestTranscription = data.results[0].alternatives[0].transcript;
            socket.emit('transcription', latestTranscription);
          }
        })
        .on('error', (err) => {
          console.error('Speech-to-Text error:', err);
          socket.emit('error', 'Transcription error');
        })
        .on('end', () => {
          console.log('Speech stream ended');
        });

      // Translate every 500ms
      translationInterval = setInterval(async () => {
        if (latestTranscription) {
          try {
            const [translation] = await translateClient.translate(latestTranscription, 'en');
            socket.emit('translation', translation);
          } catch (err) {
            console.error('Translation error:', err);
          }
        }
      }, 500);

      socket.on('audio', (data) => {
        if (Buffer.isBuffer(data)) {
          recognizeStream.write(data);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        clearInterval(translationInterval);
        recognizeStream.end();
      });
    });
  }

  return new NextResponse(null, { status: 200 });
}
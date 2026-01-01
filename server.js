const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { SpeechClient } = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Handle Google Cloud credentials from Replit secrets
let credentials = {};
let hasCredentials = false;
try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    hasCredentials = true;
    console.log('Google Cloud credentials loaded from Replit secrets.');
  } else {
    console.warn('No Google Cloud credentials found in environment variables. Running in demo mode.');
  }
} catch (error) {
  console.error('Failed to parse Google Cloud credentials:', error);
  console.warn('Running in demo mode without Google Cloud services.');
}

// Initialize Google Cloud clients with credentials (only if available)
let speechClient, translateClient;
if (hasCredentials) {
  speechClient = new SpeechClient({ credentials });
  translateClient = new Translate({ credentials });
} else {
  console.log('Google Cloud services disabled - running in demo mode');
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    let latestTranscription = '';
    let translationInterval;
    let recognizeStream;

    if (hasCredentials && speechClient) {
      // Initialize speech recognition for this client
      recognizeStream = speechClient
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
          console.log('Speech stream ended for:', socket.id);
        });

      // Translate every 500ms
      translationInterval = setInterval(async () => {
        if (latestTranscription && translateClient) {
          try {
            const [translation] = await translateClient.translate(latestTranscription, 'en');
            socket.emit('translation', translation);
          } catch (err) {
            console.error('Translation error:', err);
          }
        }
      }, 500);
    } else {
      // Demo mode - simulate transcription
      console.log('Running in demo mode for client:', socket.id);

      // Simulate some demo transcription
      translationInterval = setInterval(() => {
        if (latestTranscription) {
          // Simple mock translation for demo
          const mockTranslation = latestTranscription + ' (Demo Translation)';
          socket.emit('translation', mockTranslation);
        }
      }, 1000);

      // Mock transcription for demo purposes
      setTimeout(() => {
        latestTranscription = 'مرحبا بالعالم';
        socket.emit('transcription', latestTranscription);
      }, 2000);
    }

    // Handle audio data from client
    socket.on('audio', (data) => {
      if (hasCredentials && recognizeStream && Buffer.isBuffer(data)) {
        recognizeStream.write(data);
      } else if (!hasCredentials) {
        // In demo mode, just acknowledge audio data
        console.log('Demo mode: Received audio data from client');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (translationInterval) {
        clearInterval(translationInterval);
      }
      if (recognizeStream) {
        recognizeStream.end();
      }
    });
  });

  const port = process.env.PORT || 3000;

  // Handle port conflicts gracefully
  server.listen(port, (err) => {
    if (err) {
      console.error(`Failed to start server on port ${port}:`, err.message);
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use. Trying port ${port + 1}...`);
        server.listen(port + 1, () => {
          console.log(`Server running on port ${port + 1}`);
          console.log('Individual Arabic transcription system ready');
        });
      }
    } else {
      console.log(`Server running on port ${port}`);
      console.log(`Demo mode: ${hasCredentials ? 'Google Cloud services enabled' : 'Google Cloud services disabled - running in demo mode'}`);
      console.log('Individual Arabic transcription system ready');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

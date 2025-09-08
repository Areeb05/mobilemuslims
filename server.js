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
const translateClient = new Translate({ credentials });

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('message', (msg) => {
      console.log('Received:', msg);
      socket.emit('response', 'Hello from server');
    });
    
    // Add custom logic for transcription and translation
    let latestTranscription = '';
    let translationInterval;
    
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
        console.log('Received audio data');
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (translationInterval) {
        clearInterval(translationInterval);
      }
      recognizeStream.end();
    });
  });

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}); 
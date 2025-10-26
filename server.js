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

// Room management
const rooms = new Map(); // roomCode -> room data
const socketToRoom = new Map(); // socket.id -> roomCode

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

    // Handle room joining
    socket.on('join-room', (data) => {
      const { roomCode, language = 'en' } = data;
      const upperCode = roomCode.toUpperCase();

      // Validate room code format
      if (!/^[A-Z0-9]{4,6}$/.test(upperCode)) {
        socket.emit('error', 'Invalid room code format');
        return;
      }

      // Check if room exists and is active
      if (!rooms.has(upperCode) || rooms.get(upperCode).status !== 'active') {
        socket.emit('error', 'Room not found or inactive');
        return;
      }

      const room = rooms.get(upperCode);

      // Join socket.io room
      socket.join(`room_${upperCode}`);
      socketToRoom.set(socket.id, upperCode);

      // Add participant to room
      room.participants.push({
        id: socket.id,
        language,
        joinedAt: new Date()
      });

      console.log(`Client ${socket.id} joined room ${upperCode} with language ${language}`);

      // Send current transcription if available
      if (room.latestTranscription) {
        socket.emit('transcription', room.latestTranscription);
        socket.emit('translation', room.translations[language] || room.translations.en);
      }

      // Notify all participants in room about new participant
      socket.to(`room_${upperCode}`).emit('participant-joined', {
        id: socket.id,
        language,
        totalParticipants: room.participants.length
      });

      // Send room info to the new participant
      socket.emit('room-joined', {
        roomCode: upperCode,
        participants: room.participants.length,
        languages: room.languages,
        transcription: room.latestTranscription,
        translation: room.translations[language] || room.translations.en
      });
    });

    // Handle individual transcription (legacy support)
    socket.on('start-individual', () => {
      console.log('Starting individual transcription for:', socket.id);

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
          console.log('Individual speech stream ended for:', socket.id);
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
        console.log('Individual client disconnected:', socket.id);
        if (translationInterval) {
          clearInterval(translationInterval);
        }
        recognizeStream.end();
      });
    });

    // Handle mosque room creation
    socket.on('create-room', (data) => {
      const { roomCode, languages = ['en'] } = data;
      const upperCode = roomCode.toUpperCase();

      // Validate room code
      if (!/^[A-Z0-9]{4,6}$/.test(upperCode)) {
        socket.emit('error', 'Invalid room code format');
        return;
      }

      // Check if room already exists
      if (rooms.has(upperCode)) {
        socket.emit('error', 'Room code already exists');
        return;
      }

      // Create new room
      const room = {
        code: upperCode,
        status: 'active',
        participants: [],
        languages,
        latestTranscription: '',
        translations: {},
        createdAt: new Date(),
        recognizeStream: null,
        translationInterval: null
      };

      rooms.set(upperCode, room);

      // Join the creator to their own room
      socket.join(`room_${upperCode}`);
      socketToRoom.set(socket.id, upperCode);

      room.participants.push({
        id: socket.id,
        language: 'en',
        joinedAt: new Date(),
        isCreator: true
      });

      console.log(`Room ${upperCode} created by ${socket.id}`);

      // Initialize speech recognition for this room
      initializeRoomAudioStream(upperCode);

      socket.emit('room-created', {
        roomCode: upperCode,
        participants: room.participants.length
      });
    });

    // Handle mosque audio (from mosque dashboard)
    socket.on('mosque-audio', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode || !rooms.has(roomCode)) {
        socket.emit('error', 'Not in a valid room');
        return;
      }

      const room = rooms.get(roomCode);
      if (room.recognizeStream && Buffer.isBuffer(data)) {
        room.recognizeStream.write(data);
      }
    });

    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (roomCode && rooms.has(roomCode)) {
        const room = rooms.get(roomCode);

        // Remove participant
        room.participants = room.participants.filter(p => p.id !== socket.id);

        // If no participants left, clean up the room
        if (room.participants.length === 0) {
          cleanupRoom(roomCode);
        } else {
          // Notify remaining participants
          socket.to(`room_${roomCode}`).emit('participant-left', {
            id: socket.id,
            remainingParticipants: room.participants.length
          });
        }
      }

      socketToRoom.delete(socket.id);
      console.log('Client disconnected:', socket.id);
    });
  });

  // Initialize audio stream for a room
  function initializeRoomAudioStream(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    let latestTranscription = '';

    const recognizeStream = speechClient
      .streamingRecognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'ar-XA', // Modern Standard Arabic
        },
        interimResults: true,
      })
      .on('data', async (data) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          latestTranscription = data.results[0].alternatives[0].transcript;
          room.latestTranscription = latestTranscription;

          // Broadcast transcription to all room participants
          io.to(`room_${roomCode}`).emit('transcription', latestTranscription);

          // Generate translations for all room languages
          try {
            for (const lang of room.languages) {
              if (lang !== 'ar') { // Don't translate Arabic to Arabic
                const [translation] = await translateClient.translate(latestTranscription, lang);
                room.translations[lang] = translation;
              }
            }

            // Broadcast translations to participants based on their language preference
            room.participants.forEach(participant => {
              const translation = room.translations[participant.language] || room.translations.en;
              if (translation) {
                io.to(participant.id).emit('translation', translation);
              }
            });
          } catch (err) {
            console.error('Translation error for room', roomCode, ':', err);
          }
        }
      })
      .on('error', (err) => {
        console.error('Speech-to-Text error for room', roomCode, ':', err);
        io.to(`room_${roomCode}`).emit('error', 'Transcription error');
      })
      .on('end', () => {
        console.log('Room speech stream ended for:', roomCode);
      });

    room.recognizeStream = recognizeStream;
  }

  // Clean up room resources
  function cleanupRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      if (room.recognizeStream) {
        room.recognizeStream.end();
      }
      if (room.translationInterval) {
        clearInterval(room.translationInterval);
      }
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} cleaned up`);
    }
  }

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Room-based translation system ready');
  });
});

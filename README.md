# Mobile Muslims - Arabic Speech Transcription

A real-time Arabic speech-to-text transcription and English translation application for Islamic prayer assistance.

## Architecture

This application has been migrated from Next.js to a modern client-server architecture:

- **Client**: React + TypeScript + Vite (Port 3000)
- **Server**: Node.js + Express + Socket.io (Port 3001)

## Quick Start

### Prerequisites
- Node.js >= 18.17.0
- npm >= 10.5.0

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd mobilemuslims
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Client environment (optional - defaults to localhost:3001)
   cp client/.env.example client/.env.local

   # Server environment
   cp server/.env.example server/.env
   # Edit server/.env with your Google Cloud credentials
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start both the client (http://localhost:3000) and server (http://localhost:3001) concurrently.

## Development

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm run start` - Start the production server
- `npm run clean` - Clean all node_modules and build directories

### Project Structure

```
mobilemuslims/
├── client/                 # React SPA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # Client services
│   │   └── styles/         # CSS styles
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # API Server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Server entry point
│   └── package.json
├── package.json            # Workspace configuration
└── README.md
```

## Google Cloud Setup

To enable speech-to-text and translation features:

1. Create a Google Cloud Project
2. Enable the Speech-to-Text and Translate APIs
3. Create a service account and download the JSON key
4. Set the `GOOGLE_CREDENTIALS_JSON` environment variable in `server/.env`

If no credentials are provided, the app runs in demo mode with mock responses.

## Deployment

### Production Build

```bash
npm run build
npm run start
```

The server will serve both the API and the built client application.

### Environment Variables for Production

```bash
# Server
NODE_ENV=production
PORT=3001
CLIENT_URL=https://yourdomain.com
GOOGLE_CREDENTIALS_JSON=...

# Client (build-time)
VITE_API_URL=https://yourdomain.com
```

## API Documentation

### WebSocket Events

**Client → Server:**
- `audio`: Audio data buffer for speech recognition

**Server → Client:**
- `transcription`: Arabic text transcription
- `translation`: English translation
- `error`: Error messages
- `connect/disconnect`: Connection status

### REST API

- `GET /api/health` - Health check endpoint

## Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Socket.io Client
- **Backend**: Node.js, Express, Socket.io, Google Cloud Speech & Translate
- **Development**: ESLint, Concurrently, Hot reloading

## Migration Notes

This application was migrated from Next.js to a client-server architecture for:

- Better separation of concerns
- Independent scaling of client and server
- Simplified deployment
- Reduced bundle size
- More control over server architecture

## License

[Add your license here]

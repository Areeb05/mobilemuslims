# Mobile Muslims - Islamic Prayer Assistance Platform

A comprehensive Islamic prayer assistance platform featuring real-time Arabic speech-to-text transcription, English translation, AI-powered prayer guidance, and subscription-based premium features including Pain-Free Salah training.

## Features

### Core Features

- 🎙️ **Real-time Arabic Speech Recognition**: Live transcription of Arabic prayers and duas
- 🌐 **Instant English Translation**: Real-time translation of Arabic text to English
- 🤖 **AI Prayer Trainer**: Interactive AI assistant for learning proper prayer techniques
- 📚 **Pain-Free Salah Training**: Subscription-based comprehensive salah education program
- 💳 **Premium Subscriptions**: Stripe-powered payment system for premium features
- 📱 **Responsive Design**: Modern React-based UI with Tailwind CSS
- 🔒 **Secure Authentication**: Supabase-powered user authentication and database
- 📊 **Progress Tracking**: User progress tracking for training modules

### Understand Salah Feature

The **Understand Salah** feature (`/understandsalah`) is the core real-time translation functionality that enables users to:

#### How It Works
1. **Audio Capture**: Uses browser's MediaRecorder API to capture microphone audio
2. **Real-time Processing**: Streams audio data to server via WebSocket connection
3. **Speech Recognition**: Google Cloud Speech-to-Text API converts Arabic speech to text
4. **Translation**: Google Cloud Translate API provides instant English translation
5. **Live Display**: Shows both Arabic transcription and English translation simultaneously

#### Key Capabilities
- **Arabic Dialect Support**: Optimized for Modern Standard Arabic (`ar-XA`)
- **Automatic Punctuation**: AI-powered punctuation for better readability
- **Real-time Updates**: Sub-second latency for live transcription
- **Fullscreen Mode**: Dedicated fullscreen views for Arabic or English text
- **Mobile Optimized**: Works on smartphones and tablets with proper audio handling
- **Wake Lock**: Prevents device sleep during extended prayer sessions
- **Connection Recovery**: Automatic reconnection and stream recreation on network issues

#### Technical Implementation
- **WebSocket Communication**: Real-time bidirectional communication between client and server
- **Audio Processing**: 16kHz linear PCM audio with optimized chunking
- **Stream Management**: Automatic stream recreation to handle Google Cloud API timeouts
- **Error Handling**: Graceful degradation to demo mode without Google Cloud credentials
- **Battery Optimization**: Efficient audio processing to minimize device resource usage

#### Demo Mode
When Google Cloud credentials are not configured, the app runs in demo mode with:
- Simulated Arabic transcription ("مرحبا بالعالم")
- Mock English translation with "(Demo Translation)" indicator
- Full UI functionality for testing and development

This feature is essential for Muslims who want to understand the meaning of Arabic prayers during salah, especially those learning Arabic or following along with translations.

## Architecture

This application uses a modern client-server architecture with npm workspaces:

- **Client**: React 18 + TypeScript + Vite (Port 3000)
- **Server**: Node.js + Express + Socket.io (Port 3001)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Deployment**: Railway with automated CI/CD

## Quick Start

### Prerequisites

#### Required Software
- **Node.js** >= 18.17.0 (LTS recommended)
- **npm** >= 10.5.0 (comes with Node.js)
- **Git** for version control

#### Required Accounts & API Keys
- **Google Cloud Platform** account with billing enabled
  - Speech-to-Text API enabled
  - Translate API enabled
  - Service account key with appropriate permissions
- **Supabase** account and project
  - Project URL and API keys (anon + service role)
- **Stripe** account (for payments)
  - Publishable and secret keys
  - Webhook signing secret
- **OpenRouter** account (for AI features)
  - API key for Grok integration

#### Optional (for full development experience)
- **Supabase CLI** >= 1.200.3 (for local development)
- **Railway** account (for deployment)
- **VS Code** with recommended extensions

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mobilemuslims
   ```

2. **Install dependencies:**
   ```bash
   # Install all workspace dependencies
   npm install
   ```

   > **Note**: This project uses npm workspaces. Dependencies are installed at the root level and shared across client/server packages.

3. **Set up Supabase (Database & Authentication):**
   ```bash
   # Install Supabase CLI (if not already installed)
   npm install -g supabase@latest

   # Login to Supabase
   supabase login

   # Link to your Supabase project
   supabase link --project-ref your-project-ref

   # Push database schema and run migrations
   supabase db push

   # (Optional) Start local Supabase for development
   supabase start
   ```

4. **Configure environment variables:**

   **Client environment (.env.local):**
   ```bash
   cp client/.env.example client/.env.local
   ```
   Edit `client/.env.local` with your values:
   ```bash
   VITE_API_URL=http://localhost:3001
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   **Server environment (.env):**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with your values:
   ```bash
   PORT=3001
   CLIENT_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development

   # Google Cloud
   GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}

   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PFS_WEBHOOK_SECRET=whsec_...

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # OpenRouter
   OPENROUTER_API_KEY=sk-or-...
   ```

5. **Start development servers:**
   ```bash
   # Start both client and server concurrently
   npm run dev
   ```

   This will start:
   - Client at http://localhost:3000
   - Server at http://localhost:3001
   - Supabase Studio at http://localhost:54323 (if local Supabase is running)

## Development

### Available Scripts

#### Root Level Scripts (Workspace)
- `npm run dev` - Start both client and server in development mode concurrently
- `npm run build` - Build both client and server for production
- `npm run start` - Start the production server
- `npm run clean` - Clean all node_modules and build directories across workspaces
- `npm run install:all` - Install dependencies for all workspaces
- `npm run lint` - Run linting across all workspaces

#### Client Scripts (`npm run --workspace=client <script>`)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

#### Server Scripts (`npm run --workspace=server <script>`)
- `npm run dev` - Start with tsx watch mode
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Local Development Workflow

#### Using Local Supabase

For full development experience with local database:

```bash
# Start local Supabase stack
supabase start

# In another terminal, start the app
npm run dev
```

Access local services:
- **Supabase Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres

#### Database Migrations

```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations to local database
supabase db reset

# Push to remote (production)
supabase db push
```

#### Environment Management

```bash
# Copy environment templates
cp client/.env.example client/.env.local
cp server/.env.example server/.env

# Edit with your local values
# client/.env.local for client-side variables
# server/.env for server-side secrets
```

### Code Quality

#### Linting
```bash
# Lint all workspaces
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

#### TypeScript
The project uses strict TypeScript configuration:
- No implicit `any` types
- Strict null checks
- Unused variable detection
- Path mapping with `@/` aliases

#### Commit Conventions
This project follows [Conventional Commits](https://conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code restructuring
test: testing related changes
chore: maintenance tasks
```

### Project Structure

```
mobilemuslims/
├── client/                    # React SPA (Frontend)
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # Shadcn/ui components
│   │   │   └── ...           # Feature components
│   │   ├── contexts/         # React contexts (Auth, etc.)
│   │   ├── lib/              # Utilities and configurations
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── utils.ts      # Utility functions
│   │   ├── pages/            # Page components/routes
│   │   ├── styles/           # CSS and styling
│   │   └── index.tsx         # React app entry point
│   ├── public/               # Static assets
│   ├── .env.example          # Environment variables template
│   ├── package.json
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   ├── tsconfig.json         # TypeScript configuration
│   ├── vite.config.ts        # Vite configuration
│   └── index.html            # HTML template
├── server/                    # Node.js API Server
│   ├── src/
│   │   ├── lib/              # Server utilities
│   │   ├── routes/           # API route handlers
│   │   └── index.ts          # Server entry point
│   ├── .env.example          # Environment variables template
│   ├── package.json
│   └── tsconfig.json         # TypeScript configuration
├── supabase/                  # Supabase configuration
│   ├── config.toml           # Supabase project config
│   ├── migrations/           # Database migrations
│   └── .gitignore
├── public/                    # Shared static assets
├── components.json           # Shadcn/ui configuration
├── package.json              # Workspace root configuration
├── tsconfig.json             # Root TypeScript config
├── .npmrc                    # NPM configuration
├── .gitignore                # Git ignore rules
├── railway.toml              # Railway deployment config
└── README.md
```

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note your project URL and API keys from the project settings

### 2. Install Supabase CLI

```bash
npm install -g supabase@latest
```

### 3. Link to Your Project

```bash
# Login to Supabase
supabase login

# Link to your remote project
supabase link --project-ref your-project-ref
```

### 4. Push Database Schema

```bash
# Push migrations to create tables and functions
supabase db push
```

### 5. (Optional) Local Development

For local development with full Supabase stack:

```bash
# Start local Supabase services
supabase start

# This starts:
# - PostgreSQL database (port 54322)
# - Supabase API (port 54321)
# - Supabase Studio (port 54323)
# - Inbucket (email testing) (port 54324)
```

### Database Schema

The application uses two main tables:

- **subscriptions**: Manages user subscriptions for Pain-Free Salah
- **documents**: Stores knowledge base content for AI trainer (with vector embeddings)

### Environment Variables

Add these to your `server/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

And to `client/.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## API Services Setup

### Google Cloud (Speech & Translation)

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs:**
   ```bash
   # Enable Speech-to-Text API
   gcloud services enable speech.googleapis.com

   # Enable Translate API
   gcloud services enable translate.googleapis.com
   ```

3. **Create Service Account:**
   ```bash
   # Create service account
   gcloud iam service-accounts create mobile-muslims-speech \
     --description="Service account for speech recognition" \
     --display-name="Mobile Muslims Speech"

   # Grant necessary permissions
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:mobile-muslims-speech@your-project-id.iam.gserviceaccount.com" \
     --role="roles/cloudtranslate.user"

   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:mobile-muslims-speech@your-project-id.iam.gserviceaccount.com" \
     --role="roles/speech.client"
   ```

4. **Generate JSON Key:**
   - Go to IAM & Admin > Service Accounts
   - Select your service account
   - Create a new JSON key
   - Download and save securely

5. **Environment Setup:**
   ```bash
   # In server/.env
   GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
   ```

> **Note**: Without Google Cloud credentials, the app runs in demo mode with mock responses.

### Stripe (Payments)

1. **Create Stripe Account:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Create account and verify email

2. **Get API Keys:**
   - Go to Developers > API Keys
   - Copy Publishable key and Secret key

3. **Set up Webhooks:**
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, etc.
   - Copy webhook signing secret

4. **Environment Setup:**
   ```bash
   # In server/.env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PFS_WEBHOOK_SECRET=whsec_...
   ```

### OpenRouter (AI Features)

1. **Create OpenRouter Account:**
   - Go to [OpenRouter.ai](https://openrouter.ai/)
   - Sign up and get API key

2. **Environment Setup:**
   ```bash
   # In server/.env
   OPENROUTER_API_KEY=sk-or-...
   ```

> **Note**: OpenRouter provides access to multiple AI models including Grok for the AI prayer trainer.

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

### WebSocket Events (Understand Salah)

**Client → Server:**
- `audio`: Audio data buffer (16kHz linear PCM) for real-time speech recognition

**Server → Client:**
- `transcription`: Live Arabic text transcription from speech
- `translation`: Real-time English translation of Arabic text
- `error`: Error messages (connection issues, API failures)
- `connect/disconnect`: WebSocket connection status updates

#### Audio Processing Flow
1. Browser captures microphone audio using MediaRecorder API
2. Audio chunks are sent via WebSocket to `/api/stream` endpoint
3. Server streams audio to Google Cloud Speech-to-Text API
4. Arabic transcription is emitted back to client immediately
5. Every 500ms, latest transcription is translated to English
6. Both Arabic and English text are displayed in real-time with auto-scrolling

### REST API

- `GET /api/health` - Health check endpoint
- `POST /api/donations` - Process donations
- `POST /api/painfreesalah` - PFS subscription management
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `GET /api/documents` - Retrieve AI training documents

## Troubleshooting

### Common Setup Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### Supabase Connection Issues
```bash
# Check if local Supabase is running
supabase status

# Reset local database
supabase db reset

# Check migration status
supabase migration list
```

#### Google Cloud Authentication Errors
- Verify JSON key format (should start with `{"type":"service_account"...`)
- Check that APIs are enabled in Google Cloud Console
- Ensure service account has correct permissions

#### Environment Variable Issues
```bash
# Check if variables are loaded
npm run --workspace=server dev -- --env-info

# Validate .env file syntax
node -e "require('dotenv').config(); console.log('Env loaded successfully')"
```

#### Understand Salah Specific Issues

**Microphone Permission Denied:**
- Ensure HTTPS in production (required for microphone access)
- Check browser permissions in address bar
- Try refreshing the page and re-granting permissions

**Audio Not Working:**
- Verify microphone is not muted in system settings
- Check if another application is using the microphone
- Try different browsers (Chrome recommended for best WebRTC support)

**Poor Audio Quality:**
- Use external microphone for better quality
- Ensure quiet environment for clearer speech recognition
- Speak clearly and at normal pace (Arabic speech recognition works best with clear pronunciation)

**WebSocket Connection Issues:**
- Check network connectivity
- Verify server is running on correct port (3001)
- Look for firewall blocking WebSocket connections
- Try different network if connection keeps dropping

#### Build Errors
```bash
# Clear all caches and reinstall
npm run clean
rm -rf client/node_modules server/node_modules node_modules
npm install

# Check TypeScript errors
npm run --workspace=client build
npm run --workspace=server build
```

#### Database Migration Issues
```bash
# Reset and reapply migrations
supabase db reset

# Check migration status
supabase migration list

# Manually apply specific migration
supabase db push
```

### Development Tips

- Use `console.log` in server code for debugging API calls
- Check browser Network tab for client-side API errors
- Use Supabase Studio to inspect database state
- Test WebSocket connections using browser dev tools
- Check server logs for real-time error monitoring

## Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Socket.io Client
- **Backend**: Node.js, Express, Socket.io, Google Cloud Speech & Translate
- **Database**: Supabase, PostgreSQL, pgvector
- **Payments**: Stripe
- **AI**: OpenRouter, Grok
- **Deployment**: Railway
- **Development**: ESLint, TypeScript, npm workspaces

## Migration Notes

This application was migrated from Next.js to a client-server architecture for:

- Better separation of concerns
- Independent scaling of client and server
- Simplified deployment
- Reduced bundle size
- More control over server architecture
- Real-time features with WebSockets

## Contributing

### Development Standards

#### Code Style
- **TypeScript**: Strict typing, no `any` types
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Imports**: Use `import type` for type-only imports
- **Components**: Functional components with hooks
- **Error Handling**: Proper try/catch blocks and error boundaries

#### Git Workflow
1. Create feature branch from `main`
2. Follow conventional commit format
3. Write descriptive commit messages
4. Create pull request with detailed description
5. Ensure CI passes and code review is completed

#### Pull Request Guidelines
- **Title**: Clear, descriptive title following conventional commits
- **Description**: Include what changed and why
- **Testing**: Describe how changes were tested
- **Screenshots**: Include UI changes screenshots
- **Breaking Changes**: Clearly mark any breaking changes

#### Code Review Checklist
- [ ] TypeScript types are correct and complete
- [ ] No console.log statements in production code
- [ ] Environment variables are properly documented
- [ ] Error handling is appropriate
- [ ] Tests pass (if applicable)
- [ ] Code follows project conventions
- [ ] Documentation is updated if needed

### Setting Up Development Environment

1. Follow the installation steps above
2. Install recommended VS Code extensions:
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
3. Configure your IDE with project settings

### Adding New Features

1. **Database Changes**:
   - Create migration files in `supabase/migrations/`
   - Update TypeScript types if needed
   - Test migrations locally

2. **API Endpoints**:
   - Add route handlers in `server/src/routes/`
   - Update API documentation
   - Add proper error handling

3. **Frontend Components**:
   - Use shadcn/ui components when possible
   - Follow existing component patterns
   - Add proper TypeScript types

### Testing

Currently, the project uses manual testing. Future enhancements may include:
- Unit tests with Vitest
- Integration tests for API endpoints
- E2E tests with Playwright

#### Testing Understand Salah Feature

**Audio Testing:**
- Use browser developer tools to monitor WebSocket connections
- Check Network tab for real-time WebSocket traffic
- Monitor console for audio processing logs
- Test with different Arabic speech samples

**Demo Mode Testing:**
- Remove Google Cloud credentials to test demo functionality
- Verify mock transcription appears after 2 seconds
- Check that "(Demo Translation)" appears in translations
- Ensure full UI functionality works without API calls

**Mobile Testing:**
- Test microphone permissions on mobile devices
- Verify responsive design on various screen sizes
- Check wake lock functionality prevents screen sleep
- Test fullscreen mode on mobile browsers

## License

MIT License - see LICENSE file for details

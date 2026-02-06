# Whisper.cpp WebAssembly Integration

This directory contains the WebAssembly build of Whisper.cpp for offline Arabic speech recognition.

## Current Status: Development Mode

**The app currently runs in mock mode** with a placeholder WASM file. This allows you to test the UI and functionality while you build the real WebAssembly module.

## Setup Instructions

### Option 1: Build from Source (Recommended for Production)

#### 1. Install Emscripten
```bash
# Using Homebrew (macOS)
brew install emscripten

# Or using the official installer
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

#### 2. Build Whisper.cpp for WebAssembly
```bash
# Clone Whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp

# Build for WebAssembly using Emscripten
mkdir build-em && cd build-em
emcmake cmake ..
make -j

# Copy the built files to this directory
cp bin/whisper.wasm /path/to/your/project/public/whisper/
cp bin/whisper.js /path/to/your/project/public/whisper/  # if generated
```

#### 3. Download Models
Download models from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp):
- `ggml-tiny.bin` (39 MB) - Fastest, least accurate
- `ggml-base.bin` (74 MB) - Good balance of speed and accuracy
- `ggml-small.bin` (244 MB) - Most accurate for Arabic

### Option 2: Use Docker Build
```bash
# If you have Docker running
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
docker run --rm -v $(pwd):/src -w /src \
  emscripten/emsdk:latest \
  bash -c "mkdir build && cd build && emcmake cmake .. && make -j4"
```

### Option 3: Use Pre-built Demo (For Testing)
The app includes a working mock implementation. Visit the working demo at:
- https://whisper.ggerganov.com/

## File Structure

```
whisper/
├── whisper.wasm          # Compiled Whisper WebAssembly module (currently mock)
├── whisper.js            # Emscripten-generated JavaScript glue (when built)
├── models/               # Downloaded model files (empty in development)
│   ├── ggml-tiny.bin     # (download separately)
│   ├── ggml-base.bin     # (download separately)
│   └── ggml-small.bin    # (download separately)
└── README.md            # This file
```

## Development vs Production

### Development Mode (Current)
- Uses mock WASM file
- Simulates transcription with Arabic text
- Allows UI testing without compilation
- No actual speech recognition

### Production Mode (After Building WASM)
- Real WebAssembly Whisper.cpp
- Actual Arabic speech-to-text
- Offline processing capability
- Full AI-powered transcription

## Testing the Current Implementation

1. Start the development server: `npm run dev`
2. Navigate to `/understandsalah/offline`
3. Click "Models" to see the settings dialog
4. Try recording - you'll see mock Arabic transcription
5. The UI works end-to-end for testing

## Browser Requirements

- **WebAssembly support** (all modern browsers)
- **IndexedDB support** for model caching
- **Web Audio API** for microphone access
- **At least 2GB RAM** for small models

## Performance Notes

- **Tiny model**: ~2x real-time on modern CPUs
- **Base model**: ~1.5x real-time
- **Small model**: ~1x real-time (slower than real-time)

Arabic transcription works best with multilingual models (not `.en` variants).

## Troubleshooting

**WASM Loading Errors:**
- Ensure the server serves `.wasm` files with correct MIME type: `application/wasm`
- Check browser console for Emscripten errors
- Verify WASM file is not corrupted

**Model Download Issues:**
- Ensure CORS headers allow cross-origin requests
- Check network connectivity for large model files (up to 244MB)
- Verify sufficient disk space

**Audio Processing Errors:**
- Verify microphone permissions are granted
- Check that audio format is supported (16kHz WAV)
- Ensure browser supports Web Audio API

**Emscripten Build Issues:**
- Ensure Emscripten is properly activated: `source emsdk/emsdk_env.sh`
- Check that all dependencies are installed
- Try building with fewer threads: `make -j2` instead of `make -j`

## Next Steps

1. **Build the real WASM** using the instructions above
2. **Test with actual models** by downloading them to `models/`
3. **Verify Arabic transcription** works correctly
4. **Optimize performance** for your target devices
5. **Add model quantization** for smaller file sizes
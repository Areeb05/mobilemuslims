# Whisper.cpp WebAssembly Integration

This directory contains the WebAssembly build of Whisper.cpp for offline Arabic speech recognition.

## Setup Instructions

### 1. Build Whisper.cpp for WebAssembly

```bash
# Clone Whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp

# Build for WebAssembly using Emscripten
mkdir build-em && cd build-em
emcmake cmake ..
make -j

# Copy the built files to this directory
cp bin/whisper.wasm ../../public/whisper/
```

### 2. Download Pre-built Models

Download the following models from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp):

- `ggml-tiny.bin` (39 MB) - Fastest, least accurate
- `ggml-base.bin` (74 MB) - Good balance of speed and accuracy
- `ggml-small.bin` (244 MB) - Most accurate for Arabic

Place them in the `models/` directory.

### 3. Alternative: Use CDN

For development/testing, you can load models from a CDN instead of storing locally:

```javascript
// In useWhisperModel.ts, modify downloadModel to use CDN URLs
const CDN_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/';
const modelUrl = `${CDN_BASE}ggml-${modelName}.bin`;
```

## File Structure

```
whisper/
├── whisper.wasm          # Compiled Whisper WebAssembly module
├── whisper.js            # Emscripten-generated JavaScript glue
├── models/               # Downloaded model files
│   ├── ggml-tiny.bin
│   ├── ggml-base.bin
│   └── ggml-small.bin
└── README.md            # This file
```

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
- Ensure the server serves `.wasm` files with correct MIME type
- Check browser console for Emscripten errors

**Model Download Issues:**
- Ensure CORS headers allow cross-origin requests
- Check network connectivity for large model files

**Audio Processing Errors:**
- Verify microphone permissions are granted
- Check that audio format is supported (16kHz WAV)
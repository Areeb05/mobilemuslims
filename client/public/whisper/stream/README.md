# Stream.wasm Integration

This directory contains the stream.wasm implementation from whisper.cpp, adapted for real-time Arabic speech recognition.

## Files Needed

To make this work, you need these compiled files from the stream.wasm example:

### Required Files:
- `libstream.js` - Main JavaScript module with WASM bindings
- `libstream.wasm` - Compiled WebAssembly module (if separate file)
- `libstream.worker.js` - Web worker for audio processing (optional)

## How to Build

### Method 1: Using Emscripten (Recommended)

```bash
# Clone whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp

# Build the stream.wasm example
mkdir build && cd build
emcmake cmake .. -DWHISPER_WASM_BUILD=ON
make stream.wasm

# Copy files to this directory
cp bin/libstream.js /path/to/your/project/public/whisper/stream/
cp bin/libstream.wasm /path/to/your/project/public/whisper/stream/  # if separate
```

### Method 2: Using the Pre-built Demo

Visit https://ggml.ai/whisper.cpp/stream.wasm/ and save the page source, then extract the JavaScript and WASM files.

## Current Implementation

The `StreamUnderstandSalah.tsx` component is designed to work with the stream.wasm API:

### JavaScript API:
```javascript
// Initialize with model and language
const streamId = window.stream.init(modelUrl, 'ar');

// Send audio data
window.stream.set_audio(streamId, audioBuffer);

// Get transcription
const text = window.stream.get_transcribed();

// Get status
const status = window.stream.get_status();

// Cleanup
window.stream.free(streamId);
```

### Audio Processing:
- Records audio at 16kHz mono
- Processes in 5-second chunks for real-time transcription
- Uses Arabic language model for optimal recognition

### Translation:
- Uses dictionary-based translation for common Islamic phrases
- Falls back to placeholder for unknown phrases
- Can be extended with Google Translate API

## Testing

1. Load the page at `/understandsalah/stream`
2. Click "Models" to select and load a Whisper model
3. Click "Start Streaming" to begin real-time transcription
4. Speak Arabic phrases clearly
5. See live transcription and translation

## Production Deployment

For production use:

1. **Host models on CDN** for faster loading
2. **Enable CORS** for model downloads
3. **Serve WASM files** with correct MIME types
4. **Implement error handling** for network issues
5. **Add offline model caching** using IndexedDB

## Troubleshooting

### Common Issues:

**WASM not loading:**
- Check that `libstream.js` is being served correctly
- Verify CORS headers for WASM files
- Check browser console for loading errors

**Model download fails:**
- Ensure model URLs are accessible
- Check network connectivity
- Verify sufficient disk space

**Audio not working:**
- Grant microphone permissions
- Check audio context creation
- Verify sample rate compatibility

**Poor transcription quality:**
- Use larger models (base/small instead of tiny)
- Ensure clear audio input
- Speak at normal pace with clear pronunciation
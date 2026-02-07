#!/bin/bash

# Setup Whisper Models for CDN Hosting
# This script downloads models and prepares them for CDN upload

set -e

echo "🎯 Setting up Whisper models for CDN hosting..."
echo ""

# Create models directory
mkdir -p models
cd models

echo "📥 Downloading Whisper models..."

# Download models (start with the most important ones)
echo "Downloading tiny model (39MB)..."
curl -L -o ggml-tiny.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"

echo "Downloading base model (74MB) - recommended for Arabic..."
curl -L -o ggml-base.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"

echo "Downloading tiny.en model (39MB)..."
curl -L -o ggml-tiny.en.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"

# Optional: Download larger models
read -p "Download small model (244MB)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Downloading small model (244MB)..."
    curl -L -o ggml-small.bin \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
fi

echo ""
echo "✅ Models downloaded successfully!"
echo ""
echo "📤 Next steps:"
echo "1. Upload these files to your CDN (Cloudflare R2, AWS S3, etc.)"
echo "2. Make sure CORS is enabled: Access-Control-Allow-Origin: *"
echo "3. Update the URLs in client/src/hooks/useWhisperModel.ts"
echo "4. Update the URLs in client/src/pages/StreamUnderstandSalah.tsx"
echo ""
echo "📁 Files ready for upload:"
ls -lh *.bin
echo ""
echo "🔗 Example CDN URLs to replace:"
echo "  https://your-cdn.com/whisper-models/ggml-tiny.bin"
echo "  https://your-cdn.com/whisper-models/ggml-base.bin"
echo "  https://your-cdn.com/whisper-models/ggml-tiny.en.bin"
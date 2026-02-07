#!/bin/bash

# Production Setup: Upload Whisper Models to CDN
# This script downloads models and provides instructions for CDN hosting

set -e

echo "🚀 Setting up Whisper models for CDN hosting..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create models directory
echo -e "${BLUE}Creating models directory...${NC}"
mkdir -p models
cd models

echo -e "${YELLOW}📥 Downloading essential Whisper models...${NC}"
echo ""

# Download tiny model (always recommended)
echo -e "${GREEN}Downloading tiny model (39MB - recommended for production)...${NC}"
if curl -L -o ggml-tiny.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin" 2>/dev/null; then
    echo -e "${GREEN}✓ Tiny model downloaded successfully${NC}"
else
    echo -e "${RED}✗ Failed to download tiny model${NC}"
    exit 1
fi

# Download base model (good balance)
echo -e "${GREEN}Downloading base model (74MB - good for Arabic)...${NC}"
if curl -L -o ggml-base.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" 2>/dev/null; then
    echo -e "${GREEN}✓ Base model downloaded successfully${NC}"
else
    echo -e "${RED}✗ Failed to download base model${NC}"
fi

# Optional: Ask about small model
echo ""
read -p "$(echo -e ${YELLOW}"Download small model (244MB) for best Arabic accuracy? (y/N): "${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Downloading small model (244MB)...${NC}"
    if curl -L -o ggml-small.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin" 2>/dev/null; then
        echo -e "${GREEN}✓ Small model downloaded successfully${NC}"
    else
        echo -e "${RED}✗ Failed to download small model${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📁 Downloaded models:${NC}"
ls -lh *.bin 2>/dev/null || echo "No models downloaded"
echo ""

echo -e "${YELLOW}📤 NEXT STEPS: Upload to CDN${NC}"
echo ""
echo -e "${GREEN}1. Choose a CDN provider:${NC}"
echo "   • Cloudflare R2 (free tier, great for this)"
echo "   • AWS S3 + CloudFront"
echo "   • DigitalOcean Spaces"
echo "   • Bunny.net (affordable)"
echo ""

echo -e "${GREEN}2. Upload the model files:${NC}"
echo "   Upload all .bin files from this 'models/' directory to your CDN"
echo ""

echo -e "${GREEN}3. Configure CORS headers:${NC}"
echo "   Set: Access-Control-Allow-Origin: *"
echo "   Set: Access-Control-Allow-Methods: GET, HEAD, OPTIONS"
echo "   Set: Cache-Control: public, max-age=31536000"
echo ""

echo -e "${GREEN}4. Get your CDN URLs:${NC}"
echo "   Example: https://your-cdn.com/whisper-models/ggml-tiny.bin"
echo "   Example: https://your-cdn.com/whisper-models/ggml-base.bin"
echo ""

echo -e "${GREEN}5. Update the code:${NC}"
echo "   Edit: client/src/hooks/useWhisperModel.ts"
echo "   Replace: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
echo "   With:    https://your-cdn.com/whisper-models/"
echo ""

echo -e "${GREEN}6. Deploy and test:${NC}"
echo "   npm run build && deploy to Railway"
echo "   Test at: https://your-app.railway.app/understandsalahoffline"
echo ""

echo -e "${RED}⚠️  IMPORTANT:${NC}"
echo "• Keep model URLs private (don't commit to git)"
echo "• Monitor CDN bandwidth costs"
echo "• Consider model compression for smaller files"
echo ""

echo -e "${BLUE}🎯 Production Benefits:${NC}"
echo "• ✅ No CORS issues"
echo "• ✅ Fast downloads worldwide"
echo "• ✅ Reliable model loading"
echo "• ✅ Better user experience"
echo ""

echo -e "${GREEN}Setup complete! Ready for CDN upload.${NC}"
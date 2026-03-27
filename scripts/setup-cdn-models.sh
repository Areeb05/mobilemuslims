#!/bin/bash
# Understand Salah offline uses @huggingface/transformers in the browser.
# Models (Whisper tiny, opus-mt ar→en) download from Hugging Face on first visit and cache via the library.
# No ggml/WASM assets or useWhisperModel paths are required anymore.

echo "Offline Understand Salah: models load automatically in the client from Hugging Face."
echo "Ensure COOP/COEP headers remain set in Vite (see client/vite.config.ts) for WASM threads if needed."

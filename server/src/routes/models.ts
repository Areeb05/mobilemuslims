import express from 'express'
import axios from 'axios'

const router = express.Router()

// Model metadata for validation - support both ggml (WASM) and ONNX (WebGPU) models
const MODEL_CONFIGS = {
  // WASM models (ggml format)
  'tiny': {
    size: 39 * 1024 * 1024, // ~39MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    format: 'ggml',
    backend: 'wasm'
  },
  'base': {
    size: 74 * 1024 * 1024, // ~74MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    format: 'ggml',
    backend: 'wasm'
  },
  'small': {
    size: 244 * 1024 * 1024, // ~244MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    format: 'ggml',
    backend: 'wasm'
  },

  // WebGPU models (ONNX format) - Note: These are loaded directly by transformers.js
  // We provide fallback download if needed, but they're primarily loaded via CDN
  'tiny-onnx': {
    size: 39 * 1024 * 1024, // ~39MB
    url: 'https://huggingface.co/onnx-community/whisper-tiny/resolve/main/model.onnx',
    format: 'onnx',
    backend: 'webgpu'
  },
  'base-onnx': {
    size: 74 * 1024 * 1024, // ~74MB
    url: 'https://huggingface.co/onnx-community/whisper-base/resolve/main/model.onnx',
    format: 'onnx',
    backend: 'webgpu'
  },
  'small-onnx': {
    size: 244 * 1024 * 1024, // ~244MB
    url: 'https://huggingface.co/onnx-community/whisper-small/resolve/main/model.onnx',
    format: 'onnx',
    backend: 'webgpu'
  }
} as const

// GET /api/models/:modelName - Download model through relay
router.get('/:modelName', async (req, res) => {
  const { modelName } = req.params

  // Validate model name
  const modelConfig = MODEL_CONFIGS[modelName as keyof typeof MODEL_CONFIGS]
  if (!modelConfig) {
    return res.status(400).json({
      error: 'Invalid model name',
      available: Object.keys(MODEL_CONFIGS)
    })
  }

  try {
    console.log(`📥 Relaying download for model: ${modelName}`)

    // Get model from HuggingFace
    const response = await axios.get(modelConfig.url, {
      responseType: 'stream',
      timeout: 300000, // 5 minute timeout for large files
      headers: {
        'User-Agent': 'Mobile-Muslims/1.0'
      }
    })

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', response.headers['content-length'] || modelConfig.size)
    res.setHeader('Content-Disposition', `attachment; filename="ggml-${modelName}.bin"`)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

    // Stream the response directly to client
    response.data.pipe(res)

    // Handle errors during streaming
    response.data.on('error', (error: Error) => {
      console.error('Stream error:', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' })
      }
    })

  } catch (error: any) {
    console.error('Model download error:', error.message)
    res.status(500).json({
      error: 'Failed to download model',
      details: error.message
    })
  }
})

// GET /api/models - List available models
router.get('/', (_req, res) => {
  res.json({
    models: Object.entries(MODEL_CONFIGS).map(([name, config]) => ({
      name,
      size: config.size,
      sizeMB: Math.round(config.size / (1024 * 1024)),
      url: `/api/models/${name}`,
      format: config.format,
      backend: config.backend
    }))
  })
})

export default router
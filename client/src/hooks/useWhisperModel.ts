import { useState, useEffect, useCallback } from 'react';

export interface WhisperModel {
  name: string;
  size: string;
  url: string;
  localPath: string;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  backend?: 'webgpu' | 'wasm';
}

export interface UseWhisperModelReturn {
  models: WhisperModel[];
  downloadModel: (modelName: string) => Promise<void>;
  deleteModel: (modelName: string) => Promise<void>;
  getModel: (modelName: string) => WhisperModel | undefined;
  isModelReady: (modelName: string) => boolean;
}

// Available Whisper models for Arabic transcription
// Support both WebGPU (ONNX) and WASM (ggml) backends
const WEBGPU_MODELS: Omit<WhisperModel, 'downloaded' | 'downloading' | 'progress'>[] = [
  {
    name: 'tiny',
    size: '39 MB',
    url: 'https://huggingface.co/onnx-community/whisper-tiny/resolve/main', // Direct ONNX model URL
    localPath: '/whisper/models/whisper-tiny.onnx',
    backend: 'webgpu'
  },
  {
    name: 'base',
    size: '74 MB',
    url: 'https://huggingface.co/onnx-community/whisper-base/resolve/main', // Direct ONNX model URL
    localPath: '/whisper/models/whisper-base.onnx',
    backend: 'webgpu'
  },
  {
    name: 'small',
    size: '244 MB',
    url: 'https://huggingface.co/onnx-community/whisper-small/resolve/main', // Direct ONNX model URL
    localPath: '/whisper/models/whisper-small.onnx',
    backend: 'webgpu'
  }
];

const WASM_MODELS: Omit<WhisperModel, 'downloaded' | 'downloading' | 'progress'>[] = [
  {
    name: 'tiny-wasm',
    size: '39 MB',
    url: '/api/models/tiny', // Server relay endpoint
    localPath: '/whisper/models/ggml-tiny.bin',
    backend: 'wasm'
  },
  {
    name: 'base-wasm',
    size: '74 MB',
    url: '/api/models/base', // Server relay endpoint
    localPath: '/whisper/models/ggml-base.bin',
    backend: 'wasm'
  },
  {
    name: 'small-wasm',
    size: '244 MB',
    url: '/api/models/small', // Server relay endpoint
    localPath: '/whisper/models/ggml-small.bin',
    backend: 'wasm'
  }
];

// Combine models with priority for WebGPU when available
const AVAILABLE_MODELS = [...WEBGPU_MODELS, ...WASM_MODELS];

export function useWhisperModel(): UseWhisperModelReturn {
  const [models, setModels] = useState<WhisperModel[]>([]);

  // Initialize models on mount
  useEffect(() => {
    const initializeModels = async () => {
      const initializedModels = await Promise.all(
        AVAILABLE_MODELS.map(async (model) => {
          const downloaded = await checkIfModelExists(model.localPath);
          return {
            ...model,
            downloaded,
            downloading: false,
            progress: 0
          };
        })
      );
      setModels(initializedModels);
    };

    initializeModels();
  }, []);

  const checkIfModelExists = async (localPath: string): Promise<boolean> => {
    try {
      // Check if model exists in IndexedDB or local storage
      const db = await openModelDatabase();
      const modelData = await getModelFromDB(db, localPath);
      return modelData !== null;
    } catch (error) {
      console.warn('Error checking model existence:', error);
      return false;
    }
  };

  const downloadModel = useCallback(async (modelName: string) => {
    const model = models.find(m => m.name === modelName);
    if (!model || model.downloaded || model.downloading) return;

    setModels(prev => prev.map(m =>
      m.name === modelName
        ? { ...m, downloading: true, progress: 0 }
        : m
    ));

    try {
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];

      if (!reader) throw new Error('Failed to get response reader');

      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        const progress = contentLength > 0 ? (receivedLength / contentLength) * 100 : 0;
        setModels(prev => prev.map(m =>
          m.name === modelName
            ? { ...m, progress: Math.round(progress) }
            : m
        ));
      }

      // Combine chunks into single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const modelBuffer = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        modelBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Save to IndexedDB
      const db = await openModelDatabase();
      await saveModelToDB(db, model.localPath, modelBuffer);

      setModels(prev => prev.map(m =>
        m.name === modelName
          ? { ...m, downloaded: true, downloading: false, progress: 100 }
          : m
      ));

    } catch (error) {
      console.error('Model download failed:', error);
      setModels(prev => prev.map(m =>
        m.name === modelName
          ? { ...m, downloading: false, progress: 0 }
          : m
      ));
      throw error;
    }
  }, [models]);

  const deleteModel = useCallback(async (modelName: string) => {
    const model = models.find(m => m.name === modelName);
    if (!model || !model.downloaded) return;

    try {
      const db = await openModelDatabase();
      await deleteModelFromDB(db, model.localPath);

      setModels(prev => prev.map(m =>
        m.name === modelName
          ? { ...m, downloaded: false, downloading: false, progress: 0 }
          : m
      ));
    } catch (error) {
      console.error('Model deletion failed:', error);
      throw error;
    }
  }, [models]);

  const getModel = useCallback((modelName: string) => {
    return models.find(m => m.name === modelName);
  }, [models]);

  const isModelReady = useCallback((modelName: string) => {
    const model = models.find(m => m.name === modelName);
    return model?.downloaded === true;
  }, [models]);

  return {
    models,
    downloadModel,
    deleteModel,
    getModel,
    isModelReady
  };
}

// IndexedDB helpers for model storage
const DB_NAME = 'WhisperModels';
const DB_VERSION = 1;
const STORE_NAME = 'models';

async function openModelDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveModelToDB(db: IDBDatabase, key: string, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getModelFromDB(db: IDBDatabase, key: string): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function deleteModelFromDB(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
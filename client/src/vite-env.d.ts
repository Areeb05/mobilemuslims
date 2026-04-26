/// <reference types="vite/client" />

interface Window {
  /** Set by the production server when serving index.html (Railway public origin). */
  __PUBLIC_APP_ORIGIN__?: string
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

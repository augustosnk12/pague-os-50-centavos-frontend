/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Developer's Pix key for "Apoie o projeto" (improvement 51); empty = the item does not appear. */
  readonly VITE_SUPPORT_PIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

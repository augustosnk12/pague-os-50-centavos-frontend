/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string
/** Day of the build, YYYY-MM-DD (vite.config.ts). */
declare const __BUILD_DAY__: string

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Developer's Pix key for "Apoie o projeto" (improvement 51); empty = the item does not appear. */
  readonly VITE_SUPPORT_PIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

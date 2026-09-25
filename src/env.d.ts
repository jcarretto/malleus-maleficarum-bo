/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of malleus-maleficarum-api, e.g. http://localhost:8080. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

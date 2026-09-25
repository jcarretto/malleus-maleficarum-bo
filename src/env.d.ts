/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of malleus-maleficarum-api, e.g. http://localhost:8080. */
  readonly VITE_API_URL?: string
  /** Google OAuth "Web application" client id. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

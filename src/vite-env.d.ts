/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN_WEB?: string;
  readonly VITE_SENTRY_DSN_ELECTRON?: string;
  readonly VITE_SENTRY_ENABLED?: string;
}

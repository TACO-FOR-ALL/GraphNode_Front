const DEFAULT_SENTRY_WEB_DSN =
  "https://4ba8676896688d9265bab8f482f9fc3d@o4510902220095488.ingest.us.sentry.io/4511238065291264";

const DEFAULT_SENTRY_ELECTRON_DSN =
  "https://34e90f5b2fd6ae86560e77c95e561d7e@o4510902220095488.ingest.us.sentry.io/4511238061883392";

export const SENTRY_WEB_DSN =
  import.meta.env.VITE_SENTRY_DSN_WEB || DEFAULT_SENTRY_WEB_DSN;

export const SENTRY_ELECTRON_DSN =
  import.meta.env.VITE_SENTRY_DSN_ELECTRON || DEFAULT_SENTRY_ELECTRON_DSN;

export const SENTRY_RELEASE = __SENTRY_RELEASE__;

export function isRendererSentryEnabled() {
  return import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === "true";
}

export function isElectronMainSentryEnabled(isPackaged: boolean) {
  return isPackaged || import.meta.env.VITE_SENTRY_ENABLED === "true";
}

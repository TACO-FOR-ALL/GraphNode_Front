import * as Sentry from "@sentry/electron/renderer";
import {
  SENTRY_ELECTRON_DSN,
  SENTRY_RELEASE,
  isRendererSentryEnabled,
} from "@/sentry/config";

let initialized = false;

export function initPreloadSentry() {
  if (initialized) return;

  Sentry.init({
    dsn: SENTRY_ELECTRON_DSN,
    environment: import.meta.env.MODE ?? "development",
    enabled: isRendererSentryEnabled(),
    release: SENTRY_RELEASE,
    sendDefaultPii: true,
    initialScope: {
      tags: {
        appVersion: __APP_VERSION__,
        process: "preload",
        runtime: "electron",
        surface: "desktop",
      },
    },
  });

  initialized = true;
}

export function sendPreloadSmokeTest() {
  return Sentry.withScope((scope) => {
    scope.setTag("smoke_test", "preload");
    return Sentry.captureException(
      new Error("GraphNode preload Sentry smoke test"),
    );
  });
}

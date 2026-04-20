import * as Sentry from "@sentry/electron/main";
import { app } from "electron";
import {
  SENTRY_ELECTRON_DSN,
  SENTRY_RELEASE,
  isElectronMainSentryEnabled,
} from "@/sentry/config";

let initialized = false;

export function initMainSentry() {
  if (initialized) return;

  Sentry.init({
    dsn: SENTRY_ELECTRON_DSN,
    environment:
      process.env.NODE_ENV ?? (app.isPackaged ? "production" : "development"),
    enabled: isElectronMainSentryEnabled(app.isPackaged),
    release: SENTRY_RELEASE,
    sendDefaultPii: true,
    initialScope: {
      tags: {
        appVersion: __APP_VERSION__,
        process: "main",
        runtime: "electron",
        surface: "desktop",
      },
    },
  });

  initialized = true;
}

export function captureMainException(
  error: unknown,
  tags: Record<string, string> = {},
) {
  let eventId: string | null = null;

  Sentry.withScope((scope) => {
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    eventId = Sentry.captureException(error);
  });

  return eventId;
}

export function sendMainSmokeTest() {
  return captureMainException(new Error("GraphNode main Sentry smoke test"), {
    smoke_test: "main",
  });
}

import { isElectron } from "@/utils/platform";
import {
  SENTRY_ELECTRON_DSN,
  SENTRY_RELEASE,
  SENTRY_WEB_DSN,
  isRendererSentryEnabled,
} from "./config";

type SentryScope = {
  setExtra: (key: string, value: unknown) => void;
  setTag: (key: string, value: string) => void;
};

type RendererSentryModule = {
  captureException: (error: unknown) => string;
  withScope: (callback: (scope: SentryScope) => void) => void;
};

type CaptureRendererExceptionContext = {
  componentStack?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
};

let rendererSentry: RendererSentryModule | null = null;
let initialized = false;

export async function initRendererSentry() {
  if (initialized) return;

  const environment = import.meta.env.MODE ?? "development";
  const enabled = isRendererSentryEnabled();

  if (isElectron()) {
    const [electronSentry, reactSentry] = await Promise.all([
      import("@sentry/electron/renderer"),
      import("@sentry/react"),
    ]);

    electronSentry.init(
      {
        dsn: SENTRY_ELECTRON_DSN,
        environment,
        enabled,
        release: SENTRY_RELEASE,
        sendDefaultPii: true,
        initialScope: {
          tags: {
            appVersion: __APP_VERSION__,
            process: "renderer",
            runtime: "electron",
            surface: "desktop",
          },
        },
      },
      reactSentry.init,
    );

    rendererSentry = electronSentry;
  } else {
    const reactSentry = await import("@sentry/react");

    reactSentry.init({
      dsn: SENTRY_WEB_DSN,
      environment,
      enabled,
      release: SENTRY_RELEASE,
      sendDefaultPii: true,
      initialScope: {
        tags: {
          appVersion: __APP_VERSION__,
          process: "renderer",
          runtime: "web",
          surface: "browser",
        },
      },
    });

    rendererSentry = reactSentry;
  }

  initialized = true;
}

export function captureRendererException(
  error: unknown,
  context: CaptureRendererExceptionContext = {},
) {
  const sentry = rendererSentry;
  if (!sentry) return null;

  let eventId: string | null = null;

  sentry.withScope((scope) => {
    if (context.componentStack) {
      scope.setExtra("componentStack", context.componentStack);
    }

    Object.entries(context.extra ?? {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    Object.entries(context.tags ?? {}).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    eventId = sentry.captureException(error);
  });

  return eventId;
}

export function sendRendererSmokeTest() {
  return captureRendererException(new Error("GraphNode renderer Sentry smoke test"), {
    tags: {
      smoke_test: "renderer",
    },
  });
}

export function installSentryDebugHelpers() {
  if (typeof window === "undefined") return;

  window.__graphnodeSentry = {
    release: SENTRY_RELEASE,
    runtime: isElectron() ? "electron" : "web",
    smokeTestRenderer: async () => sendRendererSmokeTest(),
    smokeTestPreload: async () => {
      return (await window.sentryAPI?.smokeTestPreload?.()) ?? null;
    },
    smokeTestMain: async () => {
      return (await window.sentryAPI?.smokeTestMain?.()) ?? null;
    },
    smokeTestAll: async () => {
      const renderer = sendRendererSmokeTest();
      const preload = (await window.sentryAPI?.smokeTestPreload?.()) ?? null;
      const main = (await window.sentryAPI?.smokeTestMain?.()) ?? null;

      return { renderer, preload, main };
    },
  };
}

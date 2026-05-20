import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";
import { initI18n } from "./i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { isElectron } from "./utils/platform";
import {
  captureRendererException,
  installSentryDebugHelpers,
  initRendererSentry,
} from "./sentry/renderer";

(async () => {
  await initRendererSentry().catch((error) => {
    console.error("Sentry init failed:", error);
  });

  await initI18n();
  installSentryDebugHelpers();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AppErrorBoundary>
    </React.StrictMode>
  );
})().catch((err) => {
  captureRendererException(err, {
    tags: {
      bootstrap: "main",
    },
  });
  console.error("App bootstrap failed:", err);
});

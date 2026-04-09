import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";
import { initI18n } from "./i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop } from "./managers/startSyncLoop";
import { queryClient } from "./queryClient";
import { isElectron } from "./utils/platform";

if (isElectron()) {
  startSyncLoop();
}

(async () => {
  await initI18n();

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
  console.error("i18n init failed:", err);
});

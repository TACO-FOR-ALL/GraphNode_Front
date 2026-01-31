import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initI18n } from "./i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startSyncLoop } from "./managers/startSyncLoop";

// 로컬 개발시 SDK base URL 호환
(globalThis as any).__GRAPHNODE_BASE_URL__ = import.meta.env.VITE_GRAPHNODE_BASE_URL;

startSyncLoop();

const queryClient = new QueryClient();

(async () => {
  await initI18n();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
})().catch((err) => {
  console.error("i18n init failed:", err);
});

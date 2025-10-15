import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initI18n } from "./i18n";

(async () => {
  await initI18n();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})().catch((err) => {
  console.error("i18n init failed:", err);
});

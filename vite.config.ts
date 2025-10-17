// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["keytar"],
            },
          },
        },
      },
      preload: {
        input: { preload: "electron/preload.ts" },
        vite: {
          build: {
            rollupOptions: {
              external: ["keytar"],
            },
          },
        },
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

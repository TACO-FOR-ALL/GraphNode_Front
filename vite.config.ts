// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "path";

export default defineConfig({
  // Vercel 배포 시 /app 경로에서 서빙
  base: "/app/",
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main/main.ts",
        vite: {
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "src"),
            },
          },
          build: {
            rollupOptions: {
              external: ["keytar"],
            },
          },
        },
      },
      preload: {
        input: { preload: "electron/preload/preload.ts" },
        vite: {
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "src"),
            },
          },
          build: {
            rollupOptions: {
              external: ["keytar"],
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

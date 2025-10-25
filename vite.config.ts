// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["keytar", "@xenova/transformers"],
            },
          },
        },
      },
      preload: {
        input: { preload: "electron/preload/preload.ts" },
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: ["@xenova/transformers"],
      output: {
        globals: {
          "@xenova/transformers": "Transformers",
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
  define: {
    global: "globalThis",
  },
});

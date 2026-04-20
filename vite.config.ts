// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "path";
import { execSync } from "node:child_process";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json";

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function createSentryBuildPlugins(
  projects: string[],
  mapDeleteGlobs: string[],
  assets?: string[],
) {
  const org = readEnv("SENTRY_ORG");
  const authToken = readEnv("SENTRY_AUTH_TOKEN");

  if (!org || !authToken || projects.length === 0) {
    return [];
  }

  const gitSha = getGitSha();
  const releaseSuffix = readEnv("SENTRY_RELEASE") || pkg.version;
  const releaseName = gitSha
    ? `graphnode@${releaseSuffix}-${gitSha}`
    : `graphnode@${releaseSuffix}`;

  return [
    sentryVitePlugin({
      org,
      project: projects,
      authToken,
      debug:
        process.env.SENTRY_DEBUG === "1" ||
        process.env.SENTRY_DEBUG === "true",
      release: {
        name: releaseName,
        setCommits: false,
      },
      sourcemaps: {
        ...(assets ? { assets } : {}),
        filesToDeleteAfterUpload: mapDeleteGlobs,
      },
    }),
  ];
}

const webProject = readEnv("SENTRY_PROJECT_WEB");
const electronProject = readEnv("SENTRY_PROJECT_ELECTRON");
const gitSha = getGitSha();
const releaseSuffix = readEnv("SENTRY_RELEASE") || pkg.version;
const sentryReleaseName = gitSha
  ? `graphnode@${releaseSuffix}-${gitSha}`
  : `graphnode@${releaseSuffix}`;
const rendererProjects = [webProject, electronProject].filter(
  (value): value is string => Boolean(value),
);
const desktopProjects = electronProject ? [electronProject] : [];
const sharedDefines = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __SENTRY_RELEASE__: JSON.stringify(sentryReleaseName),
};

function warnIfSentryUploadConfigIsIncomplete() {
  if (!process.argv.includes("build")) return;

  const missing = [
    !readEnv("SENTRY_AUTH_TOKEN") && "SENTRY_AUTH_TOKEN",
    !readEnv("SENTRY_ORG") && "SENTRY_ORG",
    !readEnv("SENTRY_PROJECT_WEB") && "SENTRY_PROJECT_WEB",
    !readEnv("SENTRY_PROJECT_ELECTRON") && "SENTRY_PROJECT_ELECTRON",
  ].filter(Boolean);

  if (missing.length === 0) return;

  console.warn(
    `[sentry] Source map upload is partially or fully disabled. Missing env: ${missing.join(
      ", ",
    )}`,
  );
}

warnIfSentryUploadConfigIsIncomplete();

export default defineConfig({
  define: sharedDefines,
  // Vercel 배포 시 /app 경로에서 서빙
  base: "/app/",
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main/main.ts",
        vite: {
          define: sharedDefines,
          plugins: createSentryBuildPlugins(
            desktopProjects,
            ["dist-electron/main.js.map"],
            ["dist-electron/main.js", "dist-electron/main.js.map"],
          ),
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "src"),
            },
          },
          build: {
            sourcemap: true,
            rollupOptions: {
              external: ["keytar", /^node:/],
            },
          },
        },
      },
      preload: {
        input: { preload: "electron/preload/preload.ts" },
        vite: {
          define: sharedDefines,
          plugins: createSentryBuildPlugins(
            desktopProjects,
            ["dist-electron/preload.mjs.map"],
            ["dist-electron/preload.mjs", "dist-electron/preload.mjs.map"],
          ),
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "src"),
            },
          },
          build: {
            sourcemap: true,
            rollupOptions: {
              external: ["keytar"],
            },
          },
        },
      },
    }),
    ...createSentryBuildPlugins(rendererProjects, ["dist/**/*.map"]),
  ],
  optimizeDeps: {
    exclude: ["@huggingface/transformers", "@graphnode/storage"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: [/^node:/],
    },
  },
});

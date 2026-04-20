import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

function readEnv(name) {
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

const requiredEnvNames = [
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT_WEB",
  "SENTRY_PROJECT_ELECTRON",
];

const optionalEnvNames = [
  "SENTRY_RELEASE",
  "SENTRY_DEBUG",
  "VITE_SENTRY_ENABLED",
  "VITE_SENTRY_DSN_WEB",
  "VITE_SENTRY_DSN_ELECTRON",
];

const missing = requiredEnvNames.filter((name) => !readEnv(name));
const gitSha = getGitSha();
const releaseSuffix = readEnv("SENTRY_RELEASE") || pkg.version;
const releaseName = gitSha
  ? `graphnode@${releaseSuffix}-${gitSha}`
  : `graphnode@${releaseSuffix}`;

console.log("Sentry config check");
console.log(`- release: ${releaseName}`);
console.log(`- org: ${readEnv("SENTRY_ORG") || "(missing)"}`);
console.log(`- web project: ${readEnv("SENTRY_PROJECT_WEB") || "(missing)"}`);
console.log(
  `- electron project: ${readEnv("SENTRY_PROJECT_ELECTRON") || "(missing)"}`,
);
console.log(
  `- runtime upload: ${missing.length === 0 ? "ready" : "not ready"}`,
);

if (missing.length > 0) {
  console.error(`- missing required env: ${missing.join(", ")}`);
}

const presentOptional = optionalEnvNames.filter((name) => readEnv(name));
console.log(
  `- optional env present: ${
    presentOptional.length > 0 ? presentOptional.join(", ") : "(none)"
  }`,
);

if (missing.length > 0) {
  process.exit(1);
}

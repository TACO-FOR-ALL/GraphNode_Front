import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants, existsSync } from "node:fs";
import { app } from "electron";

export type CliInstallStatus = {
  platform: NodeJS.Platform;
  supported: boolean;
  cliEntryPath: string | null;
  installDir: string;
  commandPath: string;
  isInstalled: boolean;
  pathConfigured: boolean;
  shellConfigPath?: string | null;
};

export type CliInstallResult = {
  ok: true;
  platform: NodeJS.Platform;
  cliEntryPath: string;
  installDir: string;
  commandPath: string;
  pathUpdated: boolean;
  requiresNewTerminal: boolean;
  shellConfigPath?: string | null;
};

function getMacInstallDir() {
  return path.join(os.homedir(), ".local", "bin");
}

function getWindowsInstallDir() {
  return path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
    "Programs",
    "GraphNode",
    "bin",
  );
}

function getInstallDir(platform = process.platform) {
  if (platform === "win32") {
    return getWindowsInstallDir();
  }

  return getMacInstallDir();
}

function getCommandPath(platform = process.platform) {
  const installDir = getInstallDir(platform);
  return path.join(installDir, platform === "win32" ? "graphnode.cmd" : "graphnode");
}

function getShellConfigPath() {
  return path.join(os.homedir(), ".zprofile");
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveBundledCliEntryPath() {
  const resourcesPath = process.resourcesPath ?? app.getAppPath();
  const candidates = [
    path.join(resourcesPath, "cli", "dist", "index.js"),
    path.join(app.getAppPath(), "apps", "cli", "dist", "index.js"),
    path.join(app.getAppPath(), "..", "apps", "cli", "dist", "index.js"),
    path.join(process.cwd(), "apps", "cli", "dist", "index.js"),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));

  if (!resolved) {
    throw new Error("Bundled GraphNode CLI entry was not found.");
  }

  return resolved;
}

async function ensureMacShellPath(installDir: string) {
  const shellConfigPath = getShellConfigPath();
  const exportLine =
    installDir === getMacInstallDir()
      ? 'export PATH="$HOME/.local/bin:$PATH"'
      : `export PATH="${installDir}:$PATH"`;

  let current = "";
  try {
    current = await readFile(shellConfigPath, "utf-8");
  } catch {
    current = "";
  }

  if (current.includes(exportLine) || current.includes(installDir)) {
    return { pathUpdated: false, shellConfigPath };
  }

  const nextContent = current
    ? `${current.trimEnd()}\n${exportLine}\n`
    : `${exportLine}\n`;

  await writeFile(shellConfigPath, nextContent, "utf-8");
  return { pathUpdated: true, shellConfigPath };
}

function getWindowsUserPath() {
  const output = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "[Environment]::GetEnvironmentVariable('Path','User')",
    ],
    { encoding: "utf-8" },
  );

  return output.trim();
}

function setWindowsUserPath(nextPath: string) {
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `[Environment]::SetEnvironmentVariable('Path', ${JSON.stringify(nextPath)}, 'User')`,
    ],
    { encoding: "utf-8" },
  );
}

function ensureWindowsUserPath(installDir: string) {
  const currentPath = getWindowsUserPath();
  const segments = currentPath
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const hasInstallDir = segments.some(
    (segment) => segment.toLowerCase() === installDir.toLowerCase(),
  );

  if (hasInstallDir) {
    return { pathUpdated: false };
  }

  const nextPath = [...segments, installDir].join(";");
  setWindowsUserPath(nextPath);
  return { pathUpdated: true };
}

async function installMacCli(cliEntryPath: string): Promise<CliInstallResult> {
  const installDir = getMacInstallDir();
  const commandPath = getCommandPath("darwin");

  await mkdir(installDir, { recursive: true });
  await writeFile(
    commandPath,
    `#!/usr/bin/env bash\nexec node ${JSON.stringify(cliEntryPath)} "$@"\n`,
    "utf-8",
  );
  await chmod(commandPath, 0o755);

  const pathState = await ensureMacShellPath(installDir);

  return {
    ok: true,
    platform: "darwin",
    cliEntryPath,
    installDir,
    commandPath,
    pathUpdated: pathState.pathUpdated,
    requiresNewTerminal: true,
    shellConfigPath: pathState.shellConfigPath,
  };
}

async function installWindowsCli(
  cliEntryPath: string,
): Promise<CliInstallResult> {
  const installDir = getWindowsInstallDir();
  const commandPath = getCommandPath("win32");

  await mkdir(installDir, { recursive: true });
  await writeFile(
    commandPath,
    `@echo off\r\nnode ${JSON.stringify(cliEntryPath)} %*\r\n`,
    "utf-8",
  );

  const pathState = ensureWindowsUserPath(installDir);

  return {
    ok: true,
    platform: "win32",
    cliEntryPath,
    installDir,
    commandPath,
    pathUpdated: pathState.pathUpdated,
    requiresNewTerminal: true,
    shellConfigPath: null,
  };
}

export async function getCliInstallStatus(): Promise<CliInstallStatus> {
  const platform = process.platform;
  const supported = platform === "darwin" || platform === "win32";

  let cliEntryPath: string | null = null;
  try {
    cliEntryPath = resolveBundledCliEntryPath();
  } catch {
    cliEntryPath = null;
  }

  const installDir = getInstallDir(platform);
  const commandPath = getCommandPath(platform);
  const isInstalled = await fileExists(commandPath);

  if (platform === "darwin") {
    const shellConfigPath = getShellConfigPath();
    let pathConfigured = process.env.PATH?.split(":").includes(installDir) ?? false;

    try {
      const shellConfig = await readFile(shellConfigPath, "utf-8");
      pathConfigured =
        pathConfigured ||
        shellConfig.includes("$HOME/.local/bin") ||
        shellConfig.includes(installDir);
    } catch {
      // ignore missing file
    }

    return {
      platform,
      supported,
      cliEntryPath,
      installDir,
      commandPath,
      isInstalled,
      pathConfigured,
      shellConfigPath,
    };
  }

  if (platform === "win32") {
    let pathConfigured = false;
    try {
      pathConfigured = getWindowsUserPath()
        .split(";")
        .map((segment) => segment.trim().toLowerCase())
        .includes(installDir.toLowerCase());
    } catch {
      pathConfigured = false;
    }

    return {
      platform,
      supported,
      cliEntryPath,
      installDir,
      commandPath,
      isInstalled,
      pathConfigured,
      shellConfigPath: null,
    };
  }

  return {
    platform,
    supported,
    cliEntryPath,
    installDir,
    commandPath,
    isInstalled,
    pathConfigured: false,
    shellConfigPath: null,
  };
}

export async function installBundledCli(): Promise<CliInstallResult> {
  const cliEntryPath = resolveBundledCliEntryPath();

  if (process.platform === "darwin") {
    return installMacCli(cliEntryPath);
  }

  if (process.platform === "win32") {
    return installWindowsCli(cliEntryPath);
  }

  throw new Error(
    `CLI install is not supported on ${process.platform}. Use npm install or Homebrew instead.`,
  );
}

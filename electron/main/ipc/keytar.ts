import { app, ipcMain } from "electron";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { Me } from "@/types/Me";

// Keytar API 키 관리
const SERVICE_NAME = "graphnode";
const KEYTAR_FALLBACK_FILE = "keytar-fallback.json";
const require = createRequire(import.meta.url);

type CredentialStore = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

type FallbackCredentialMap = Record<string, Record<string, string>>;

function getFallbackStorePath() {
  return path.join(app.getPath("userData"), KEYTAR_FALLBACK_FILE);
}

function readFallbackStore(): FallbackCredentialMap {
  try {
    const storePath = getFallbackStorePath();
    if (!fs.existsSync(storePath)) {
      return {};
    }

    const data = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(data) as FallbackCredentialMap;
  } catch (error) {
    console.error("Failed to read keytar fallback store:", error);
    return {};
  }
}

function writeFallbackStore(store: FallbackCredentialMap) {
  try {
    fs.writeFileSync(getFallbackStorePath(), JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write keytar fallback store:", error);
  }
}

function createFallbackStore(): CredentialStore {
  return {
    async getPassword(service: string, account: string) {
      return readFallbackStore()[service]?.[account] ?? null;
    },
    async setPassword(service: string, account: string, password: string) {
      const store = readFallbackStore();
      store[service] ??= {};
      store[service][account] = password;
      writeFallbackStore(store);
    },
    async deletePassword(service: string, account: string) {
      const store = readFallbackStore();
      if (!store[service] || !(account in store[service])) {
        return false;
      }

      delete store[service][account];
      if (Object.keys(store[service]).length === 0) {
        delete store[service];
      }

      writeFallbackStore(store);
      return true;
    },
  };
}

function loadCredentialStore(): CredentialStore {
  try {
    const keytar = require("keytar") as CredentialStore;
    return keytar;
  } catch (error) {
    console.error(
      "Failed to load keytar. Falling back to a local JSON store. This is less secure than Keychain.",
      error,
    );
    return createFallbackStore();
  }
}

export default function keytarIPC() {
  const credentialStore = loadCredentialStore();

  ipcMain.handle("keytar:getAPIKey", async (_event, modelName: string) => {
    return await credentialStore.getPassword(SERVICE_NAME, modelName);
  });

  ipcMain.handle(
    "keytar:setAPIKey",
    async (_event, modelName: string, apiKey: string) => {
      return await credentialStore.setPassword(SERVICE_NAME, modelName, apiKey);
    }
  );

  ipcMain.handle("keytar:deleteAPIKey", async (_event, modelName: string) => {
    return await credentialStore.deletePassword(SERVICE_NAME, modelName);
  });

  ipcMain.handle("keytar:getMe", async (_event) => {
    const meString = await credentialStore.getPassword(SERVICE_NAME, "me");
    if (!meString) {
      return null;
    }
    try {
      return JSON.parse(meString) as Me;
    } catch (error) {
      console.error("Failed to parse me data:", error);
      return null;
    }
  });

  ipcMain.handle("keytar:setMe", async (_event, me: Me) => {
    return await credentialStore.setPassword(SERVICE_NAME, "me", JSON.stringify(me));
  });

  ipcMain.handle("keytar:deleteMe", async (_event) => {
    return await credentialStore.deletePassword(SERVICE_NAME, "me");
  });
}

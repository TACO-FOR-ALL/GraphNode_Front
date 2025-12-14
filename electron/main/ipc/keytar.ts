import keytar from "keytar";
import { ipcMain } from "electron";
import { Me } from "@/types/Me";

// Keytar API 키 관리
const SERVICE_NAME = "graphnode";

export default function keytarIPC() {
  ipcMain.handle("keytar:getAPIKey", async (_event, modelName: string) => {
    return await keytar.getPassword(SERVICE_NAME, modelName);
  });

  ipcMain.handle(
    "keytar:setAPIKey",
    async (_event, modelName: string, apiKey: string) => {
      return await keytar.setPassword(SERVICE_NAME, modelName, apiKey);
    }
  );

  ipcMain.handle("keytar:deleteAPIKey", async (_event, modelName: string) => {
    return await keytar.deletePassword(SERVICE_NAME, modelName);
  });

  ipcMain.handle("keytar:getMe", async (_event) => {
    const meString = await keytar.getPassword(SERVICE_NAME, "me");
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
    return await keytar.setPassword(SERVICE_NAME, "me", JSON.stringify(me));
  });

  ipcMain.handle("keytar:deleteMe", async (_event) => {
    return await keytar.deletePassword(SERVICE_NAME, "me");
  });
}

import keytar from "keytar";
import { ipcMain } from "electron";

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
}

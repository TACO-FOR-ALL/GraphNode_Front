import { ipcMain, shell, dialog } from "electron";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { app } from "electron";
import MCPManager from "../mcp/MCPManager";
import {
  loadMCPConfig,
  updateServerConfig,
  getBuiltinServers,
  getCustomServers,
} from "../mcp/config";
import { BUILTIN_SERVERS } from "../mcp/builtins";
import { MCPServerConfig } from "../mcp/types";

export default function mcpIPC() {
  const manager = MCPManager.getInstance();

  // 앱 시작 시 enabled 서버 자동 연결
  manager.autoConnectEnabledServers().catch((error) => {
    console.error("[MCP] Failed to auto-connect servers:", error);
  });

  // 서버 목록 가져오기
  ipcMain.handle("mcp:get-servers", async () => {
    return await manager.getServers();
  });

  // Built-in 서버 목록 가져오기
  ipcMain.handle("mcp:get-builtin-servers", async () => {
    return await getBuiltinServers();
  });

  // Custom 서버 목록 가져오기
  ipcMain.handle("mcp:get-custom-servers", async () => {
    return await getCustomServers();
  });

  // Built-in 서버 메타데이터 가져오기
  ipcMain.handle("mcp:get-builtin-server-info", () => {
    return BUILTIN_SERVERS;
  });

  // 서버 상태 가져오기
  ipcMain.handle("mcp:get-server-state", async (_, serverId: string) => {
    return manager.getServerState(serverId);
  });

  // 모든 서버 상태 가져오기
  ipcMain.handle("mcp:get-all-server-states", () => {
    return manager.getAllServerStates();
  });

  // 서버 추가
  ipcMain.handle("mcp:add-server", async (_, server: MCPServerConfig) => {
    await manager.addServer(server);
    return true;
  });

  // 서버 업데이트
  ipcMain.handle("mcp:update-server", async (_, server: MCPServerConfig) => {
    await manager.updateServer(server);
    return true;
  });

  // 서버 설정 업데이트 (부분 업데이트)
  ipcMain.handle(
    "mcp:update-server-config",
    async (_, serverId: string, updates: Partial<MCPServerConfig>) => {
      return await updateServerConfig(serverId, updates);
    },
  );

  // 서버 삭제
  ipcMain.handle("mcp:delete-server", async (_, serverId: string) => {
    await manager.deleteServer(serverId);
    return true;
  });

  // 서버 연결
  ipcMain.handle("mcp:connect-server", async (_, serverId: string) => {
    await manager.connectServer(serverId);
    return manager.getServerState(serverId);
  });

  // 서버 연결 해제
  ipcMain.handle("mcp:disconnect-server", async (_, serverId: string) => {
    await manager.disconnectServer(serverId);
    return manager.getServerState(serverId);
  });

  // 도구 호출
  ipcMain.handle(
    "mcp:call-tool",
    async (
      _,
      serverId: string,
      toolName: string,
      arguments_: Record<string, unknown>,
    ) => {
      return await manager.callTool(serverId, toolName, arguments_);
    },
  );

  // 리소스 읽기
  ipcMain.handle(
    "mcp:read-resource",
    async (_, serverId: string, uri: string) => {
      return await manager.readResource(serverId, uri);
    },
  );

  // 모든 연결된 서버의 도구 목록 가져오기
  ipcMain.handle("mcp:get-all-tools", () => {
    return manager.getAllTools();
  });

  // 서버 활성화/비활성화 토글
  ipcMain.handle(
    "mcp:toggle-server",
    async (_, serverId: string, enabled: boolean) => {
      const config = await loadMCPConfig();
      const server = config.servers.find((s) => s.id === serverId);

      if (!server) {
        throw new Error(`Server not found: ${serverId}`);
      }

      await updateServerConfig(serverId, { enabled });

      if (enabled) {
        await manager.connectServer(serverId);
      } else {
        await manager.disconnectServer(serverId);
      }

      return manager.getServerState(serverId);
    },
  );

  // Built-in 서버 설정 업데이트 (예: allowedPaths)
  ipcMain.handle(
    "mcp:update-builtin-settings",
    async (_, serverId: string, settings: Record<string, unknown>) => {
      const config = await loadMCPConfig();
      const server = config.servers.find((s) => s.id === serverId);

      if (!server || server.type !== "builtin") {
        throw new Error(`Builtin server not found: ${serverId}`);
      }

      const updatedServer = await updateServerConfig(serverId, {
        settings: { ...server.settings, ...settings },
      });

      // 연결 중이면 재연결
      const state = manager.getServerState(serverId);
      if (state?.status === "connected") {
        await manager.disconnectServer(serverId);
        await manager.connectServer(serverId);
      }

      return updatedServer;
    },
  );

  // Google OAuth 인증 시작
  ipcMain.handle(
    "mcp:start-google-oauth",
    async (_, serverType: "google-calendar") => {
      try {
        const credentialsDir = path.join(
          app.getPath("userData"),
          "mcp-credentials",
        );
        await fs.mkdir(credentialsDir, { recursive: true });

        // 업로드된 자격 증명 파일 경로 (공통 파일 사용)
        const uploadedCredentialsPath = path.join(
          credentialsDir,
          "google-oauth-credentials.json",
        );

        // 자격 증명 파일 존재 확인
        try {
          await fs.access(uploadedCredentialsPath);
        } catch {
          return {
            success: false,
            error:
              "Credentials file not found. Please upload the JSON file first.",
          };
        }

        // 서버 설정 가져오기
        const config = await loadMCPConfig();
        const serverId = `builtin-${serverType}`;
        const server = config.servers.find((s) => s.id === serverId);

        if (!server) {
          throw new Error(`Server not found: ${serverId}`);
        }

        // @cocal/google-calendar-mcp auth 명령 구성
        const authCommand = "npx";
        const authArgs = ["-y", "@cocal/google-calendar-mcp", "auth"];
        const authEnv = {
          GOOGLE_OAUTH_CREDENTIALS: uploadedCredentialsPath,
        };

        return new Promise((resolve, reject) => {
          console.log(`[MCP OAuth] Starting auth for ${serverType}...`);
          console.log(
            `[MCP OAuth] Credentials path: ${uploadedCredentialsPath}`,
          );
          console.log(
            `[MCP OAuth] Command: ${authCommand} ${authArgs.join(" ")}`,
          );

          // auth 프로세스 실행 - cwd를 credentials 디렉토리로 설정
          const authProcess = spawn(authCommand, authArgs, {
            env: { ...process.env, ...authEnv },
            cwd: credentialsDir,
            stdio: "inherit",
            shell: true,
          });

          authProcess.on("error", (error) => {
            console.error(`[MCP OAuth] Error:`, error);
            reject(error);
          });

          authProcess.on("close", async (code) => {
            console.log(`[MCP OAuth] Auth process exited with code ${code}`);

            if (code === 0) {
              // 인증 성공 - 서버 설정 업데이트
              await updateServerConfig(serverId, {
                settings: {
                  ...server.settings,
                  googleOAuthCredentialsPath: uploadedCredentialsPath,
                  googleOAuthAuthenticated: true,
                },
              });
              resolve({
                success: true,
                credentialsPath: uploadedCredentialsPath,
              });
            } else {
              resolve({
                success: false,
                error: `Auth process exited with code ${code}`,
              });
            }
          });
        });
      } catch (error) {
        console.error(`[MCP OAuth] Error:`, error);
        throw error;
      }
    },
  );

  // Google OAuth 연결 상태 확인
  ipcMain.handle(
    "mcp:check-google-oauth",
    async (_, serverType: "google-drive" | "google-calendar") => {
      const config = await loadMCPConfig();
      const serverId = `builtin-${serverType}`;
      const server = config.servers.find((s) => s.id === serverId);

      if (!server) {
        return { authenticated: false };
      }

      // 토큰 파일 존재 여부 확인
      const credentialsDir = path.join(
        app.getPath("userData"),
        "mcp-credentials",
      );
      const tokenPath = path.join(credentialsDir, `${serverType}-token.json`);

      try {
        await fs.access(tokenPath);
        return {
          authenticated: true,
          credentialsPath: server.settings?.googleOAuthCredentialsPath,
        };
      } catch {
        return {
          authenticated: !!server.settings?.googleOAuthAuthenticated,
          credentialsPath: server.settings?.googleOAuthCredentialsPath,
        };
      }
    },
  );

  // Google OAuth 연결 해제
  ipcMain.handle(
    "mcp:disconnect-google-oauth",
    async (_, serverType: "google-drive" | "google-calendar") => {
      const serverId = `builtin-${serverType}`;

      // 서버 비활성화 및 설정 초기화
      await updateServerConfig(serverId, {
        enabled: false,
        settings: {
          googleOAuthCredentialsPath: undefined,
          googleOAuthAuthenticated: false,
        },
      });

      // 연결 해제
      await manager.disconnectServer(serverId);

      // 토큰 파일 삭제
      const credentialsDir = path.join(
        app.getPath("userData"),
        "mcp-credentials",
      );
      const tokenPath = path.join(credentialsDir, `${serverType}-token.json`);
      const credentialsPath = path.join(
        credentialsDir,
        `${serverType}-credentials.json`,
      );

      try {
        await fs.unlink(tokenPath);
      } catch {
        // 파일이 없으면 무시
      }

      try {
        await fs.unlink(credentialsPath);
      } catch {
        // 파일이 없으면 무시
      }

      return { success: true };
    },
  );

  // Google Cloud Console 열기 (OAuth 자격 증명 생성 안내)
  ipcMain.handle("mcp:open-google-cloud-console", async () => {
    await shell.openExternal(
      "https://console.cloud.google.com/apis/credentials",
    );
    return { success: true };
  });

  // Google OAuth 자격 증명 파일 선택 다이얼로그
  ipcMain.handle("mcp:select-google-credentials-file", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select Google OAuth Credentials JSON",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    return await processGoogleCredentialsFile(filePath);
  });

  // 드래그앤드롭으로 받은 파일 처리
  ipcMain.handle(
    "mcp:process-google-credentials-file",
    async (_, filePath: string) => {
      return await processGoogleCredentialsFile(filePath);
    },
  );

  // 파일 내용으로 자격 증명 저장 (드래그앤드롭 시 file.path 없을 때)
  ipcMain.handle(
    "mcp:save-google-credentials-content",
    async (_, content: string) => {
      return await saveGoogleCredentialsContent(content);
    },
  );
}

// Google 자격 증명 내용으로 저장 (드래그앤드롭용)
async function saveGoogleCredentialsContent(content: string): Promise<{
  success: boolean;
  error?: string;
  credentialsPath?: string;
  clientId?: string;
}> {
  try {
    const json = JSON.parse(content);

    // 데스크톱 앱 자격 증명 검증
    const credentials = json.installed || json.web;
    if (!credentials) {
      return {
        success: false,
        error:
          "Invalid credentials file. Expected 'installed' or 'web' credentials.",
      };
    }

    if (!credentials.client_id || !credentials.client_secret) {
      return {
        success: false,
        error: "Missing client_id or client_secret in credentials file.",
      };
    }

    // 앱 데이터 디렉토리에 저장
    const credentialsDir = path.join(
      app.getPath("userData"),
      "mcp-credentials",
    );
    await fs.mkdir(credentialsDir, { recursive: true });

    const destPath = path.join(credentialsDir, "google-oauth-credentials.json");
    await fs.writeFile(destPath, content, "utf-8");

    console.log(`[MCP] Credentials saved to: ${destPath}`);

    return {
      success: true,
      credentialsPath: destPath,
      clientId: credentials.client_id,
    };
  } catch (error) {
    console.error("[MCP] Failed to save credentials content:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save credentials",
    };
  }
}

// Google 자격 증명 파일 처리 (공통 로직)
async function processGoogleCredentialsFile(filePath: string): Promise<{
  success: boolean;
  canceled?: boolean;
  error?: string;
  credentialsPath?: string;
  clientId?: string;
}> {
  try {
    // 파일 읽기
    const content = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(content);

    // 데스크톱 앱 자격 증명 검증 (installed 또는 web 키 확인)
    const credentials = json.installed || json.web;
    if (!credentials) {
      return {
        success: false,
        error:
          "Invalid credentials file. Expected 'installed' or 'web' credentials.",
      };
    }

    if (!credentials.client_id || !credentials.client_secret) {
      return {
        success: false,
        error: "Missing client_id or client_secret in credentials file.",
      };
    }

    // 앱 데이터 디렉토리에 복사
    const credentialsDir = path.join(
      app.getPath("userData"),
      "mcp-credentials",
    );
    await fs.mkdir(credentialsDir, { recursive: true });

    const destPath = path.join(credentialsDir, "google-oauth-credentials.json");
    await fs.copyFile(filePath, destPath);

    return {
      success: true,
      credentialsPath: destPath,
      clientId: credentials.client_id,
    };
  } catch (error) {
    console.error("[MCP] Failed to process credentials file:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to read credentials file",
    };
  }
}

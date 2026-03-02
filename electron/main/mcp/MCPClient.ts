import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPResourcesListResult,
  MCPToolCallResult,
  MCPServerConfig,
} from "./types";

const MCP_PROTOCOL_VERSION = "2024-11-05";

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: MCPServerConfig;
  private requestId = 0;
  private pendingRequests: Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private buffer = "";
  private initialized = false;

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<MCPInitializeResult> {
    if (this.process) {
      throw new Error("Client already connected");
    }

    const command = this.config.command;
    const args = this.config.args || [];

    if (!command) {
      throw new Error("No command specified for MCP server");
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(command, args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...this.config.env },
          shell: true,
        });

        this.process.stdout?.on("data", (data: Buffer) => {
          this.handleStdout(data);
        });

        this.process.stderr?.on("data", (data: Buffer) => {
          const message = data.toString();
          // stderr에서 오는 메시지 중 실제 에러와 정보성 메시지 구분
          // npm warn, npm notice, "running on stdio" 등은 정보성 메시지
          const isInfo =
            message.includes("npm warn") ||
            message.includes("npm notice") ||
            message.includes("running on stdio") ||
            message.includes("Started without") ||
            message.includes("Usage:") ||
            message.includes("Note:");

          if (isInfo) {
            console.log(`[MCP ${this.config.id}] info:`, message.trim());
          } else if (message.includes("npm error")) {
            console.error(`[MCP ${this.config.id}] stderr:`, message);
            this.emit("error", new Error(message));
          } else {
            // 기타 stderr 출력은 경고 레벨로 로깅
            console.warn(`[MCP ${this.config.id}] stderr:`, message.trim());
          }
        });

        this.process.on("error", (error) => {
          console.error(`[MCP ${this.config.id}] process error:`, error);
          this.emit("error", error);
          reject(error);
        });

        this.process.on("close", (code) => {
          console.log(
            `[MCP ${this.config.id}] process closed with code:`,
            code,
          );
          this.cleanup();
          this.emit("close", code);
        });

        // Initialize MCP protocol
        this.initialize()
          .then((result) => {
            this.initialized = true;
            resolve(result);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString();

    // JSON-RPC 메시지는 줄바꿈으로 구분됨
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCResponse;
          this.handleMessage(message);
        } catch (error) {
          console.error(
            `[MCP ${this.config.id}] Failed to parse message:`,
            line,
            error,
          );
        }
      }
    }
  }

  private handleMessage(message: JSONRPCResponse): void {
    // Handle response
    if ("id" in message && message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }

    // Handle notification
    if ("method" in message && !("id" in message)) {
      this.emit("notification", message);
    }
  }

  private async sendRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error("MCP client not connected");
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request) + "\n";
      this.process!.stdin!.write(message, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });

      // 타임아웃 30초
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  private async initialize(): Promise<MCPInitializeResult> {
    const result = (await this.sendRequest("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "graphnode",
        version: "1.0.0",
      },
    })) as MCPInitializeResult;

    // Send initialized notification
    await this.sendNotification("notifications/initialized", {});

    return result;
  }

  private async sendNotification(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error("MCP client not connected");
    }

    const notification = {
      jsonrpc: "2.0" as const,
      method,
      params,
    };

    const message = JSON.stringify(notification) + "\n";
    this.process.stdin.write(message);
  }

  async listTools(): Promise<MCPToolsListResult> {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    return (await this.sendRequest("tools/list", {})) as MCPToolsListResult;
  }

  async listResources(): Promise<MCPResourcesListResult> {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    return (await this.sendRequest(
      "resources/list",
      {},
    )) as MCPResourcesListResult;
  }

  async callTool(
    name: string,
    arguments_: Record<string, unknown>,
  ): Promise<MCPToolCallResult> {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    return (await this.sendRequest("tools/call", {
      name,
      arguments: arguments_,
    })) as MCPToolCallResult;
  }

  async readResource(uri: string): Promise<{ contents: unknown[] }> {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    return (await this.sendRequest("resources/read", { uri })) as {
      contents: unknown[];
    };
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.process = null;
    this.initialized = false;
    this.buffer = "";
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.process !== null && this.initialized;
  }

  getConfig(): MCPServerConfig {
    return this.config;
  }
}

import openaiIPC from "./openai";
import systemIPC from "./system";
import windowIPC from "./window";
import keytarIPC from "./keytar";
import fileIPC from "./file";
import mcpIPC from "./mcp";
import graphNodeIPC from "./graphnode";

export default function ipc() {
  systemIPC();
  windowIPC();
  openaiIPC();
  keytarIPC();
  fileIPC();
  mcpIPC();
  graphNodeIPC();
}

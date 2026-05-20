import openaiIPC from "./openai";
import systemIPC from "./system";
import windowIPC from "./window";
import keytarIPC from "./keytar";
import fileIPC from "./file";
import mcpIPC from "./mcp";
import graphNodeIPC from "./graphnode";
import sentryIPC from "./sentry";

export default async function ipc() {
  systemIPC();
  windowIPC();
  openaiIPC();
  await keytarIPC();
  fileIPC();
  mcpIPC();
  graphNodeIPC();
  sentryIPC();
}

process.env.TRANSFORMERS_BACKEND = "wasm";

import openaiIPC from "./openai";
import systemIPC from "./system";
import windowIPC from "./window";
import keytarIPC from "./keytar";
import fileIPC from "./file";
import embeddingIPC from "./embedding";

export default function ipc() {
  systemIPC();
  windowIPC();
  openaiIPC();
  keytarIPC();
  fileIPC();
  embeddingIPC();
}

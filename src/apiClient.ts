import { createGraphNodeClient } from "@taco_tsinghua/graphnode-sdk";

(globalThis as any).__GRAPHNODE_BASE_URL__ = import.meta.env.VITE_GRAPHNODE_BASE_URL;
export const api = createGraphNodeClient();

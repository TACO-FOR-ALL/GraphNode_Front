const DEFAULT_GRAPHNODE_BASE_URL = "https://taco4graphnode.online";

export function getGraphNodeBaseUrl(): string {
  const envBaseUrl =
    typeof import.meta !== "undefined" ? import.meta.env.VITE_API_BASE : "";
  const runtimeBaseUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          __GRAPHNODE_BASE_URL__?: string;
        }).__GRAPHNODE_BASE_URL__
      : undefined;

  const baseUrl = envBaseUrl || runtimeBaseUrl || DEFAULT_GRAPHNODE_BASE_URL;
  return baseUrl.replace(/\/$/, "");
}


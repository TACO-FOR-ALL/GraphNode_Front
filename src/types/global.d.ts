import type { ChatCompletion } from "openai/resources/chat/completions";

export {};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

declare global {
  interface File {
    path?: string;
  }
  interface Window {
    windowAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
    systemAPI: {
      getLocale: () => Promise<string>;
    };
    openaiAPI: {
      checkAPIKeyValid: (apiKey: string) => Promise<Result<true>>;
      request: (
        apiKey: string,
        stream: boolean,
        model: string,
        messages: ChatMessageRequest[]
      ) => Promise<Result<ChatCompletion>>;
      requestGenerateThreadTitle: (
        apiKey: string,
        firstUserMessage: string,
        opts?: { timeoutMs?: number }
      ) => Promise<Result<string>>;
    };
    keytarAPI: {
      getAPIKey: (modelName: string) => Promise<string | null>;
      setAPIKey: (modelName: string, apiKey: string) => Promise<void>;
      deleteAPIKey: (modelName: string) => Promise<void>;
    };
    fileAPI: {
      readFileStream: (absPath: string, id: string) => void;
      onReadProgress: (
        cb: (p: { id: string; percent: number }) => void
      ) => () => void;
      onReadComplete: (
        cb: (p: { id: string; text: string }) => void
      ) => () => void;
      onReadError: (
        cb: (p: { id: string; message: string }) => void
      ) => () => void;
    };
    embedAPI: {
      texts: (arr: string[]) => Promise<number[][]>;
    };
  }
}

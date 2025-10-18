// src/types/global.d.ts
export {};

declare global {
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
      checkAPIKeyValid: (
        apiKey: string
      ) => Promise<{ ok: boolean; error?: string }>;
    };
    keytarAPI: {
      getAPIKey: (modelName: string) => Promise<string | null>;
      setAPIKey: (modelName: string, apiKey: string) => Promise<void>;
      deleteAPIKey: (modelName: string) => Promise<void>;
    };
  }
}

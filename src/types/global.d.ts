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
  }
}

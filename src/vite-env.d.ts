/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: {
      window?: {
        appWindow?: {
          minimize: () => Promise<void>;
          close: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
        };
      };
    };
  }
}

export {};

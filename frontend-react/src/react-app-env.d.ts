/// <reference types="react-scripts" />

// Tauri API types for production use
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (command: string, args?: any) => Promise<any>;
      };
      event: {
        listen: (
          event: string,
          callback: (event: any) => void
        ) => Promise<() => void>;
      };
    };

    // Tauri mock types for testing
    __TAURI_MOCK__?: {
      invoke: (command: string, args?: any) => Promise<any>;
      listen: (
        event: string,
        callback: (event: any) => void
      ) => Promise<() => void>;
      testPrinters: Map<string, any>;
      eventListeners: Map<string, any[]>;
      reset: () => void;
      addTestPrinter: (
        name: string,
        model?: string,
        ip?: string
      ) => Promise<any>;
    };
  }
}

/**
 * Desktop Window Control Utilities
 * Provides seamless bridge to Tauri or other native window wrappers
 */

const hasNativeWindowApi = (): boolean => (
  typeof window !== 'undefined' && Boolean(window.__TAURI__?.window?.appWindow)
);

export const desktopWindow = {
  startDragging: async (): Promise<void> => {
    if (!hasNativeWindowApi()) return;
    try {
      const tauriWindow = await import('@tauri-apps/api/window');
      await tauriWindow.getCurrentWindow().startDragging();
    } catch (err: unknown) {
      try {
        const fallbackWindow = window.__TAURI__?.window?.appWindow as { startDragging?: () => Promise<void> } | undefined;
        if (typeof window !== 'undefined' && fallbackWindow?.startDragging) {
          await fallbackWindow.startDragging();
          return;
        }
      } catch {
        // Report the original Tauri API error below for easier diagnosis.
      }
      console.error('Gagal memulai drag jendela RAB VIEWER. Periksa capability Tauri core:window:allow-start-dragging.', err);
    }
  },

  minimize: async (): Promise<void> => {
    if (!hasNativeWindowApi()) return;
    try {
      const tauriWindow = await import('@tauri-apps/api/window');
      await tauriWindow.getCurrentWindow().minimize();
    } catch (err: unknown) {
      try {
        if (typeof window !== 'undefined' && window.__TAURI__?.window?.appWindow?.minimize) {
          await window.__TAURI__.window.appWindow.minimize();
          return;
        }
      } catch {
        // Report the original Tauri API error below for easier diagnosis.
      }
      console.error('Gagal minimize jendela RAB VIEWER. Periksa capability Tauri core:window:allow-minimize.', err);
    }
  },

  isMaximized: async (): Promise<boolean> => {
    if (!hasNativeWindowApi()) return false;
    try {
      const tauriWindow = await import('@tauri-apps/api/window');
      return await tauriWindow.getCurrentWindow().isMaximized();
    } catch (err: unknown) {
      try {
        const fallbackWindow = window.__TAURI__?.window?.appWindow as { isMaximized?: () => Promise<boolean> } | undefined;
        if (typeof window !== 'undefined' && fallbackWindow?.isMaximized) {
          return await fallbackWindow.isMaximized();
        }
      } catch {
        // Report the original Tauri API error below for easier diagnosis.
      }
      console.error('Gagal membaca status maximize jendela RAB VIEWER. Periksa capability Tauri core:window:allow-is-maximized.', err);
      return false;
    }
  },

  toggleMaximize: async (): Promise<boolean> => {
    if (!hasNativeWindowApi()) return false;
    try {
      const tauriWindow = await import('@tauri-apps/api/window');
      const currentWindow = tauriWindow.getCurrentWindow();
      await currentWindow.toggleMaximize();
      return await currentWindow.isMaximized();
    } catch (err: unknown) {
      try {
        const fallbackWindow = window.__TAURI__?.window?.appWindow as {
          toggleMaximize?: () => Promise<void>;
          isMaximized?: () => Promise<boolean>;
        } | undefined;
        if (typeof window !== 'undefined' && fallbackWindow?.toggleMaximize) {
          await fallbackWindow.toggleMaximize();
          if (fallbackWindow.isMaximized) {
            return await fallbackWindow.isMaximized();
          }
        }
      } catch {
        // Report the original Tauri API error below for easier diagnosis.
      }
      console.error('Gagal maximize/restore jendela RAB VIEWER. Periksa capability Tauri core:window:allow-toggle-maximize.', err);
      return false;
    }
  },

  close: async (): Promise<void> => {
    if (!hasNativeWindowApi()) return;
    try {
      const tauriWindow = await import('@tauri-apps/api/window');
      await tauriWindow.getCurrentWindow().close();
    } catch (err: unknown) {
      try {
        if (typeof window !== 'undefined' && window.__TAURI__?.window?.appWindow?.close) {
          await window.__TAURI__.window.appWindow.close();
          return;
        }
      } catch {
        // Report the original Tauri API error below for easier diagnosis.
      }
      console.error('Gagal menutup jendela RAB VIEWER. Periksa capability Tauri core:window:allow-close.', err);
    }
  }
};

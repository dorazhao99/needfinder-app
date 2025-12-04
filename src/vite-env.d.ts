/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    runPython: () => void,
    stopPython: () => void,
    checkSetup: () => Promise<boolean>,
    getPreferences: () => Promise<{ name: string; screenshotDirectory: string } | null>,
    savePreferences: (prefs: { name: string; screenshotDirectory: string }) => Promise<boolean>,
    selectDirectory: () => Promise<string | null>
  }
}

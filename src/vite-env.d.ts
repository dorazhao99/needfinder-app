/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    runPython: () => void,
    stopPython: () => void,
    checkSetup: () => Promise<boolean>,
    getUser: () => Promise<{ name: string; file_dir: string } | null>,
    saveUser: (user: { name: string; file_dir: string }) => Promise<void>,
    selectDirectory: () => Promise<string | null>,
    closeOverlay: () => void,
    pauseOverlayTimeout: () => void,
    resumeOverlayTimeout: () => void,
    getRecordingState: () => Promise<boolean>,
    toggleRecording: () => Promise<void>,
    openSystemSettings: () => Promise<boolean>,
    callLLM: (message: string, model: string) => Promise<{ success: boolean; content?: string; error?: string }>,
    callAgent: (message: string) => Promise<{ success: boolean; message?: string; error?: string }>
  }
}

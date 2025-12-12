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
    saveSolutions: (solutions: { request: string; model: string; use_insights: boolean; solutions: { name: string; description: string; user_inputs: string; execution_prompt: string }[] }) => Promise<number[]>,
    selectSolution: (solution_id: number) => Promise<void>,
    getSolutions: (request_id: number) => Promise<{ name: string; description: string; user_inputs: string; execution_prompt: string }[]>,
    getAllSolutions: () => Promise<{ name: string; description: string; user_inputs: string; execution_prompt: string }[]>,
    saveAgentResponse: (agent_response: { solution_id: number; agent_response: string; artifact_path: string }) => Promise<void>,
    selectDirectory: () => Promise<string | null>,
    closeOverlay: () => void,
    pauseOverlayTimeout: () => void,
    resumeOverlayTimeout: () => void,
    getRecordingState: () => Promise<boolean>,
    toggleRecording: () => Promise<void>,
    openSystemSettings: () => Promise<boolean>,
    callLLM: (message: string, model: string) => Promise<{ success: boolean; content?: string; error?: string }>,
    callAgent: (message: string, solution_id: number) => Promise<{ success: boolean; message?: string; error?: string }>
  }
}

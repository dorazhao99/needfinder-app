/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    selectDirectory: () => Promise<string | null>,
    // DB functions
    checkSetup: () => Promise<boolean>,
    getUser: () => Promise<{ name: string; file_dir: string } | null>,
    saveUser: (user: { name: string; file_dir: string }) => Promise<{ success: boolean; user?: { id: number; name: string; file_dir: string }; error?: string }>,
    saveSolutions: (solutions: { request: string; model: string; use_insights: boolean; insight_ids: number[]; solutions: { name: string; description: string; user_inputs: string; execution_prompt: string }[] }) => Promise<number[]>,
    selectSolution: (solution_id: number) => Promise<void>,
    getSolutions: (request_id: number) => Promise<{ name: string; description: string; user_inputs: string; execution_prompt: string }[]>,
    getAllSolutions: () => Promise<{ name: string; description: string; user_inputs: string; execution_prompt: string }[]>,
    saveAgentResponse: (agent_response: { solution_id: number; agent_response: string; artifact_path: string }) => Promise<void>,
    getMergedInsights: () => Promise<{ title: string; tagline: string; description: string; context: string; supporting_evidence: string }[]>,
    // Recording functions
    closeOverlay: () => void,
    runPython: () => void,
    stopPython: () => void,
    pauseOverlayTimeout: () => void,
    resumeOverlayTimeout: () => void,
    getRecordingState: () => Promise<boolean>,
    toggleRecording: () => Promise<void>,
    openSystemSettings: () => Promise<boolean>,
    // LLM functions
    callLLM: (message: string, model: string) => Promise<{ success: boolean; content?: string; error?: string }>,
    callAgent: (message: string, solution_id: number) => Promise<{ success: boolean; message?: { message: string; artifact_uri?: string }; error?: string }>,
    // Insights functions
    getRelevantInsights: (query: string) => Promise<{insights: string[]; insightIds: number[]}>,
    processInsights: (user_name: string) => Promise<{ success: boolean; message?: string; error?: string }>,
  }
}

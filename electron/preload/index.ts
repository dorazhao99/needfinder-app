import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------

contextBridge.exposeInMainWorld("electronAPI", {
  runPython: () => ipcRenderer.send("run-python"),
  stopPython: () => ipcRenderer.send("stop-python"),
  checkSetup: () => ipcRenderer.invoke("check-setup"),
  getUser: () => ipcRenderer.invoke("user:get"),
  saveUser: (user: { name: string; file_dir: string }) => ipcRenderer.invoke("user:save", user),
  saveSolutions: (solutions: { request: string; model: string; insight_ids: number[]; use_insights: boolean; solutions: { name: string; description: string; user_inputs: string; execution_prompt: string }[] }) => ipcRenderer.invoke("solutions:save", solutions),
  selectSolution: (solution_id: number) => ipcRenderer.invoke("solutions:select", solution_id),
  getSolutions: (request_id: number) => ipcRenderer.invoke("solutions:get", request_id),
  getAllSolutions: () => ipcRenderer.invoke("solutions:getAll"),
  saveAgentResponse: (agent_response: { solution_id: number; agent_response: string; artifact_path: string }) => ipcRenderer.invoke("agent:response:save", agent_response),
  getMergedInsights: () => ipcRenderer.invoke("insights:getMerged"),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  getRecordingState: () => ipcRenderer.invoke("get-recording-state"),
  toggleRecording: () => ipcRenderer.invoke("toggle-recording"),
  openSystemSettings: () => ipcRenderer.invoke("open-system-settings"),
  callLLM: (message: string, model: string) => ipcRenderer.invoke("call-llm", message, model),
  callAgent: (message: string, solution_id: number) => ipcRenderer.invoke("call-agent", message, solution_id),
  processInsights: (user_name: string) => ipcRenderer.invoke("process-insights", user_name),
  closeOverlay: () => ipcRenderer.send("close-overlay"),
  pauseOverlayTimeout: () => ipcRenderer.send("pause-overlay-timeout"),
  resumeOverlayTimeout: () => ipcRenderer.send("resume-overlay-timeout"),
  getRelevantInsights: (query: string) => ipcRenderer.invoke("insights:getRelevant", query),
});


contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
import { BrowserWindow, ipcMain, dialog, app, shell } from 'electron';
import { startRecording, stopRecording } from '../services/recording';
import { closeOverlay, pauseOverlayTimeout, resumeOverlayTimeout } from '../services/detectMicrophone';
import { isRecording } from '../index';
import { isScreenRecordingAllowed } from '../index'
import { callMCPAgent } from '../services/agent'
import { setRecordingState } from '../index';
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

const GPT_MODELS = {
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-5": "gpt-5",
}

const CLAUDE_MODELS = {
  "claude-4.5-sonnet": "claude-sonnet-4-5",
  "claude-4.5-haiku": "claude-haiku-4-5",
  "claude-4.5-opus": "claude-opus-4-5",
}


// Get the main window reference - this will be set by index.ts
let win: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow | null) {
  win = window
}

// Preferences functions
const getPreferencesPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'preferences.json')
}

const readPreferences = () => {
  try {
    const prefsPath = getPreferencesPath()
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading preferences:', error)
  }
  return null
}

const writePreferences = (prefs: { name: string; screenshotDirectory: string }) => {
  try {
    const prefsPath = getPreferencesPath()
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing preferences:', error)
    return false
  }
}

// Listen for button click from renderer
// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
    const childWindow = new BrowserWindow({
      webPreferences: {
        preload,
        nodeIntegration: true,
        contextIsolation: false,
      },
    })
  
    if (VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    } else {
      childWindow.loadFile(indexHtml, { hash: arg })
    }
  })

  
ipcMain.on("run-python", (event) => {
  startRecording();
});

// Listen for stop request from renderer
ipcMain.on("stop-python", (event) => {
  stopRecording();
  event.reply("python-stopped");
});

// Check if setup is complete
ipcMain.handle("check-setup", () => {
  const prefs = readPreferences()
  return prefs !== null && prefs.name && prefs.screenshotDirectory
})

// Get preferences
ipcMain.handle("get-preferences", () => {
  return readPreferences()
})

// Save preferences
ipcMain.handle("save-preferences", (_, prefs: { name: string; screenshotDirectory: string }) => {
  return writePreferences(prefs)
})

// Open directory picker
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory'],
    title: 'Select Screenshot Directory'
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// Close overlay window
ipcMain.on("close-overlay", () => {
  closeOverlay();
})

// Pause overlay timeout
ipcMain.on("pause-overlay-timeout", () => {
  pauseOverlayTimeout();
})

// Resume overlay timeout
ipcMain.on("resume-overlay-timeout", () => {
  resumeOverlayTimeout();
})

ipcMain.handle("toggle-recording", async () => {
  if (isRecording) {
    await stopRecording();   // your logic here
    setRecordingState(false);
  } else {
    await startRecording();  // your logic here
    setRecordingState(true);
  }
});

// Get current recording state
ipcMain.handle("get-recording-state", () => {
  return isRecording;
});

// Open System Settings for screen recording permissions (macOS)
ipcMain.handle("open-system-settings", () => {
  if (os.platform() === 'darwin') {
    // Open System Settings to Screen Recording preferences
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  }
  return true;
});

ipcMain.handle("call-agent", async (_, prompt: string) => {
  try {
    const response = await callMCPAgent(prompt);
    console.log("Agent response:", response);
    return {
      success: true,
      message: response.result
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Call Anthropic API
ipcMain.handle("call-llm", async (_, message: string, model: string) => {
  try {
    // Dynamic import to avoid issues if package is not installed
    console.log(model, message)
    if (model in GPT_MODELS) {
      const gpt = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const response = await gpt.chat.completions.create({
        model: GPT_MODELS[model],
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });
      return {
        success: true,
        content: response.choices[0].message.content,
      };
    } else if (model in CLAUDE_MODELS) {
      const claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await claude.messages.create({
        model: CLAUDE_MODELS[model],
        max_tokens: 5000,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });
      return {
        success: true,
        content: response.content[0].text,
      };
    } else {
      throw new Error(`Model ${model} not supported`);
    }
  } catch (error: any) {
    console.error('LLM API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to call LLM API',
    };
  }
});

   
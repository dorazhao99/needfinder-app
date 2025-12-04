import { BrowserWindow, ipcMain, dialog, app } from 'electron';
import { startRecording, stopRecording } from '../services/recording';
import { closeOverlay, pauseOverlayTimeout, resumeOverlayTimeout } from '../services/detectMicrophone';
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

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
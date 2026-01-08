import { BrowserWindow, ipcMain, dialog, app, shell, Notification, screen } from 'electron';
import { startRecording, stopRecording } from '../services/recording';
import { closeOverlay, pauseOverlayTimeout, resumeOverlayTimeout } from '../services/detectMicrophone';
import { isRecording } from '../index';
import { processInsights } from '../services/processInsights';
import { isScreenRecordingAllowed } from '../index'
import { callMCPAgent } from '../services/agent'
import { callLLM } from '../services/llm'
import { setRecordingState } from '../index';
import { startPreprocess } from '../services/preprocessFiles';
import { fileURLToPath } from 'node:url'
import { getUser } from './db';
import { DEFAULT_FILE_DIR } from '../consts';
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

// Helper function to show a notification that stays longer
export function showLongNotification(title: string, body: string) {
  if (os.platform() === 'darwin') {
    // On macOS, use a custom notification window since timeoutType isn't supported
    const notificationWindow = new BrowserWindow({
      width: 350,
      height: 120,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Position in top-right corner
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    notificationWindow.setPosition(screenWidth - 370, 20);

    // Create HTML content for the notification
    const notificationHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 15px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: rgba(30, 30, 30, 0.95);
              color: white;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              overflow: hidden;
              cursor: pointer;
            }
            body:hover {
              background: rgba(40, 40, 40, 0.95);
            }
            .title {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .body {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.8);
              word-wrap: break-word;
              max-height: 60px;
              overflow-y: auto;
            }
          </style>
        </head>
        <body>
          <div class="title">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="body">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </body>
      </html>
    `;

    notificationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(notificationHTML)}`);
    notificationWindow.show();

    // Generate unique ID for this notification
    const notificationId = `notification-${Date.now()}`;

    // Allow click to close the notification immediately via IPC
    notificationWindow.webContents.on('dom-ready', () => {
      notificationWindow?.webContents.executeJavaScript(`
        const { ipcRenderer } = require('electron');
        document.body.addEventListener('click', () => {
          ipcRenderer.send('close-notification', '${notificationId}');
        });
      `);
    });

    // Handle close request from renderer
    const closeHandler = (_: any, id: string) => {
      if (id === notificationId && notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close();
        ipcMain.removeListener('close-notification', closeHandler);
      }
    };
    ipcMain.on('close-notification', closeHandler);

    // Auto-close after 20 seconds (longer duration - change this value to make it stay longer)
    const closeTimeout = setTimeout(() => {
      if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close();
        ipcMain.removeListener('close-notification', closeHandler);
      }
    }, 20000); // 20 seconds - adjust this value as needed

    // Clear timeout and handler when window is closed
    notificationWindow.once('closed', () => {
      clearTimeout(closeTimeout);
      ipcMain.removeListener('close-notification', closeHandler);
    });
  } else {
    // On Windows/Linux, use native notification with timeoutType
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        silent: false,
        timeoutType: 'never' as any, // Type assertion needed as TypeScript types may not include this
      });
      notification.show();
    }
  }
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

ipcMain.handle("call-agent", async (_, prompt: string, solution_id: number) => {
  try {
    const response = await callMCPAgent(prompt, solution_id);
    
    // Show notification that stays longer
    showLongNotification('Agent completed', response.result.message);
    
    return {
      success: true,
      message: response
    };
  } catch (error: any) {
    // Show notification that stays longer
    showLongNotification('Agent Error', `Agent error: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Call LLM API (delegates to shared service)
ipcMain.handle("call-llm", async (_, message: string, model: string) => {
  console.log(model, message);
  return await callLLM(message, model);
});

ipcMain.handle("process-insights", async (_, user_name: string) => {
  try {
    console.log("Starting preprocessing");
    const user = getUser();
    let file_dir = user?.file_dir || DEFAULT_FILE_DIR; 
    // Expand ~ to absolute path if present
    if (file_dir.startsWith('~')) {
      file_dir = path.join(os.homedir(), file_dir.slice(1));
    }
    console.log("File dir:", file_dir);
    await startPreprocess(file_dir);
    // Notify frontend that preprocessing is complete
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("preprocess-complete");
    }
    const resp = await processInsights(file_dir, user_name);
    return resp;
  } catch (error: any) {
    console.error("Error processing insights:", error);
    // Notify frontend of preprocessing error
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("preprocess-error", error.message);
    }
    return {
      success: false,
      error: error.message
    };
  }
});

   
import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { startRecording, stopRecording } from './services/recording'
import { startMonitoring } from './services/detectMicrophone'
import { initDatabase } from './db/db'
import './ipc/ipc'
import './ipc/db'
import './ipc/insights'
import { inferActions } from './services/inferActions'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name
app.setName('Lilac')

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

export let isRecording = false;
export let isScreenRecordingAllowed = true;
let win: BrowserWindow | null;
let tray: Tray | null = null
let isQuitting = false;
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')



async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1200,
    height: 900,
    frame: false,
    titleBarStyle: 'hiddenInset', // or similar
    show: true, // Explicitly show the window
    webPreferences: {
      preload,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }
  
  // Ensure window is visible
  win.show()
  win.focus()

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Handle window close - hide instead of closing, unless quitting
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });
  
  // Clean up when window is actually closed (only when quitting)
  win.on("closed", () => {
    if (isQuitting) {
      win = null;
    }
  });
}

function createTray() {
  // use a template icon for macOS so it adapts to dark/light mode
  const iconPath = path.join(process.env.VITE_PUBLIC, "recordTemplate.png");
  console.log(iconPath);
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip(app.getName());

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Open ${app.getName()}`,
      click: () => {
        if (!win || win.isDestroyed()) {
          createWindow(); // recreate if it was actually destroyed
        } else {
          if (!win.isVisible()) {
            win.show();
          }
          if (win.isMinimized()) {
            win.restore();
          }
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: "Start Recording",
      click: async() => {
        await startRecording();   // your logic here
        setRecordingState(true);
      },
    },
    {
      label: "Pause Recording",
      click: async() => {
        await stopRecording();   // your logic here
        setRecordingState(false);
      },
    },
    { type: 'separator' },
    {
      label: "Infer Actions",
      click: async() => {
        const result = await inferActions();
        if (result.success && result.content) {
          // Send the inferred content to the Home component
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send("inferred-actions", result.content);
          }
        } else {
          console.error("Failed to infer actions:", result.error);
        }
      },
    },
    { type: 'separator' },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    }
  ]);

  tray.setContextMenu(contextMenu);
}

export function setRecordingState(nextState: boolean) {
  isRecording = nextState;
  // notify all windows
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("recording-state-changed", isRecording);
  }
}

export function setScreenRecordingNotAllowed() {
  isScreenRecordingAllowed = false;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("get-permissions");
  }
}

// Set up application menu with keyboard shortcuts
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: process.platform === 'darwin' ? app.getName() : 'File',
      submenu: [
        {
          label: process.platform === 'darwin' ? `Quit ${app.getName()}` : 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async() => {
  console.log("Node:", process.versions.node);
  initDatabase();
  createApplicationMenu();
  createWindow();
  createTray();
  startMonitoring();
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win === null || win.isDestroyed()) {
    createWindow()
  } else {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  if (win === null || win.isDestroyed()) {
    createWindow()
  } else {
    // Show the window if it's hidden
    if (!win.isVisible()) {
      win.show()
    }
    if (win.isMinimized()) {
      win.restore()
    }
    win.focus()
  }
})







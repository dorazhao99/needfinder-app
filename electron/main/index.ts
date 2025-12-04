import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { spawn, ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { update } from './update'
import { startRecording, stopRecording } from './services/recording'
import { startMonitoring } from './services/detectMicrophone'
import { initDatabase } from './db/db'
import './ipc/ipc'
import './ipc/db'

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

let win: BrowserWindow | null = null
let tray: Tray | null = null
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

  // Auto update
  update(win)
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
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: "Start Recording",
      click: () => {
        startRecording();
      },
    },
    {
      label: "Pause Recording",
      click: () => {
        stopRecording();
      },
    },
    { type: 'separator' },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    }
  ]);

  tray.setContextMenu(contextMenu);

  // optional: left-click toggles window
  // tray.on("click", () => {
  //   if (!win) return;
  //   if (win.isVisible()) {
  //     win.hide();
  //   } else {
  //     win.show();
  //     win.focus();
  //   }
  // });
}

app.whenReady().then(async() => {
  initDatabase();
  createWindow();
  createTray();
  startMonitoring();
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})




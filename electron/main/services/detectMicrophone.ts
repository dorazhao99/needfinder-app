import {app, BrowserWindow, ipcMain, systemPreferences } from 'electron';
import { screen } from 'electron';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url'


let micMonitoringInterval: NodeJS.Timeout | null = null;
let isCurrentlyInCall = false;
let overlayWindow: BrowserWindow | null = null;
let overlayTimeout: NodeJS.Timeout | null = null;
let overlayTimeoutStartTime: number = 0;
let overlayTimeoutRemaining: number = 10000; // 10 seconds

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

// ============================================
// CREATE OVERLAY - CROSS PLATFORM
// ============================================
function createOverlay() {
    // Close existing overlay if any
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
    
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    const overlayWidth = 350;
    const overlayHeight = 90;
    const padding = 20;
  
    overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: width - overlayWidth - padding,  // Position at top right
        y: padding,                          // Top padding
        frame: false,             // no OS chrome
        transparent: true,        // allows HTML to show through
        backgroundColor: '#00000000', // transparent background (ARGB format)
        hasShadow: false,         // removes system drop-shadow
        visualEffectState: 'active', // Use 'active' for proper vibrancy/blur effects
        alwaysOnTop: true,
        resizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        focusable: true,          // you want to type into it
        webPreferences: {
          preload,
          nodeIntegration: false,
          contextIsolation: true
        }
    });
  
    // Load React app with overlay route
    if (VITE_DEV_SERVER_URL) {
        console.log(`${VITE_DEV_SERVER_URL}#overlay`);
      overlayWindow.loadURL(`${VITE_DEV_SERVER_URL}#overlay`)
    } else {
      overlayWindow.loadFile(indexHtml, { hash: 'overlay' })
    }
    
    // Pause timeout when window gains focus, resume when it loses focus
    overlayWindow.on('focus', () => {
      pauseOverlayTimeout();
    });
    
    overlayWindow.on('blur', () => {
      resumeOverlayTimeout();
    });
    
    // Clean up reference when window is closed
    overlayWindow.on('closed', () => {
      overlayWindow = null;
      // Reset call status so overlay can be opened again
    });
    
    return overlayWindow;
  }

export function closeOverlay() {
  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
    overlayTimeout = null;
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
  overlayTimeoutRemaining = 10000; // Reset for next time
}

export function pauseOverlayTimeout() {
  if (overlayTimeout && overlayWindow && !overlayWindow.isDestroyed()) {
    const elapsed = Date.now() - overlayTimeoutStartTime;
    overlayTimeoutRemaining = overlayTimeoutRemaining - elapsed;
    clearTimeout(overlayTimeout);
    overlayTimeout = null;
  }
}

export function resumeOverlayTimeout() {
  if (!overlayTimeout && overlayWindow && !overlayWindow.isDestroyed() && overlayTimeoutRemaining > 0) {
    overlayTimeoutStartTime = Date.now();
    overlayTimeout = setTimeout(() => {
      overlayWindow?.close();
      overlayTimeout = null;
      overlayTimeoutRemaining = 10000; // Reset
    }, overlayTimeoutRemaining);
  }
}

// ============================================
// MICROPHONE DETECTION - CROSS PLATFORM
// ============================================

async function isMicrophoneInUse() {
  const platform = os.platform();
  
  if (platform === 'darwin') {
    return await isMicInUseMacOS();
  } else if (platform === 'win32') {
    return await isMicInUseWindows();
  } else if (platform === 'linux') {
    return await isMicInUseLinux();
  }
  
  return false;
}

function getMicWatcherPath() {
  if (!app.isPackaged) {
     // dev: try dist-electron first (where vite plugin copies it), then fallback to source
     const distPath = path.join(APP_ROOT, 'dist-electron', 'assets', 'micwatcher', 'MicWatcher')
     const sourcePath = path.join(APP_ROOT, 'assets', 'macos', 'MicWatcher')
     
     // Check if file exists in dist-electron (built by vite plugin)
     if (fs.existsSync(distPath)) {
       return distPath
     }
     // Fallback to source location
     return sourcePath
    }
  
    // prod: inside the .app Resources
    return path.join(process.resourcesPath, 'micwatcher', 'MicWatcher');
}

let micWatcherProc = null;

function isMicInUseMacOS() {
    return new Promise((resolve) => {
        const binPath = getMicWatcherPath();
        micWatcherProc = spawn(binPath); 
        
        micWatcherProc.stdout.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg === "1" || msg === 1)  {
                resolve(true)
                return;
            };
            if (msg === "0" || msg === 0) {
                resolve(false)
                return;
            }
        });

        micWatcherProc.on('error', (err) => {
            console.error('MicWatcher failed:', err);
            resolve(false);
            return;
        });

        return;
    });
}

// Windows: Check audio recording processes
function isMicInUseWindows() {
  return new Promise((resolve) => {
    // PowerShell script to check if microphone is in use
    const psScript = `
      Get-Counter '\\Audio(*:*_Input)\\Peak Value' -ErrorAction SilentlyContinue | 
      Select-Object -ExpandProperty CounterSamples | 
      Where-Object {$_.CookedValue -gt 0.01}
    `;
    
    exec(`powershell -Command "${psScript}"`, (err, stdout) => {
      if (err) {
        // Fallback: Check for common communication apps
        exec('tasklist', (err2, stdout2) => {
          if (err2) {
            resolve(false);
            return;
          }
          
          const commApps = [
            'zoom.exe', 'teams.exe', 'slack.exe', 
            'discord.exe', 'skype.exe', 'chrome.exe',
            'msedge.exe', 'meet.exe', 'webex.exe'
          ];
          
          const hasCommApp = commApps.some(app => 
            stdout2.toLowerCase().includes(app.toLowerCase())
          );
          
          resolve(hasCommApp);
        });
        return;
      }
      
      resolve(stdout.trim().length > 0);
    });
  });
}

// Linux: Check PulseAudio/PipeWire for active sources
function isMicInUseLinux() {
  return new Promise((resolve) => {
    exec('pactl list source-outputs', (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      
      // If there are any source outputs, microphone is in use
      const hasActiveSource = stdout.includes('Source Output #');
      resolve(hasActiveSource);
    });
  });
}

// ============================================
// MONITORING LOOP
// ============================================

async function checkCallStatus() {
  try {
    const micInUse = await isMicrophoneInUse();
    if (micInUse && !isCurrentlyInCall) {
      // Call started
      isCurrentlyInCall = true;
      console.log('📞 Call detected - microphone in use');
      createOverlay();
      // Start the timeout
    //   overlayTimeoutRemaining = 10000; // 10 seconds
    //   overlayTimeoutStartTime = Date.now();
    //   overlayTimeout = setTimeout(() => {
    //     overlayWindow?.close();
    //     overlayTimeout = null;
    //     overlayTimeoutRemaining = 10000; // Reset
    //   }, overlayTimeoutRemaining);
    } else if (!micInUse && isCurrentlyInCall) {
      // Call ended - reset state so overlay can be opened again
      isCurrentlyInCall = false;
      // Close overlay if it's still open
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
        overlayWindow = null;
      }
    } 
  } catch (error) {
    console.error('Error checking call status:', error);
  }
}

// ============================================
// PERMISSIONS REQUEST (macOS)
// ============================================

export async function requestMicrophonePermission() {
  if (os.platform() === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      
      if (status !== 'granted') {
        // Request permission
        const granted = await systemPreferences.askForMediaAccess('microphone');
        return granted;
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  }
  
  return true; // Other platforms don't need explicit permission for detection
}

// ============================================
// APP LIFECYCLE
// ============================================

export function startMonitoring() {
  // Check every minute
  micMonitoringInterval = setInterval(checkCallStatus, 5000);
  
  // Initial check
  checkCallStatus();
}

export function stopMonitoring() {
  if (micMonitoringInterval) {
    clearInterval(micMonitoringInterval);
    micMonitoringInterval = null;
  }
  
  // Kill the micWatcher process if it's running
  if (micWatcherProc && !micWatcherProc.killed) {
    try {
      micWatcherProc.kill();
      micWatcherProc = null;
    } catch (error) {
      console.error('Error killing micWatcher process:', error);
    }
  }
  
  // Close overlay if open
  closeOverlay();
}


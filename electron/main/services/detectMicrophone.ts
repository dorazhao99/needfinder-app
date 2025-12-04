import {app, BrowserWindow, ipcMain, systemPreferences } from 'electron';
import { exec } from 'node:child_process';
import os from 'node:os';

let mainWindow;
let micMonitoringInterval: NodeJS.Timeout | null = null;
let isCurrentlyInCall = false;

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

// macOS: Check for processes using audio input
function isMicInUseMacOS() {
  return new Promise((resolve) => {
    // Method 1: Check if any audio input device is active
    exec('system_profiler SPAudioDataType', (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      
      // Look for "Input Source: Built-in Microphone" or similar
      console.log(stdout);
      const hasActiveInput = stdout.includes('Input Source');
      resolve(hasActiveInput);
    });
    
    // Method 2: You can also use lsof to check which processes have audio devices open
    // exec('lsof | grep "CoreAudio"', (err, stdout) => { ... });
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
  // Check every 3 seconds
  micMonitoringInterval = setInterval(checkCallStatus, 3000);
  
  // Initial check
  checkCallStatus();
}

export function stopMonitoring() {
  if (micMonitoringInterval) {
    clearInterval(micMonitoringInterval);
    micMonitoringInterval = null;
  }
}


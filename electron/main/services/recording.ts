import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { getUser } from '../ipc/db'
import { setScreenRecordingNotAllowed } from '../index'
import { DEFAULT_FILE_DIR } from '../consts'

let childProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')


function getRecording() {
  if (!app.isPackaged) {
    // dev: try dist-electron first (where vite plugin copies it), then fallback to source
    const distPath = path.join(APP_ROOT, 'dist-electron', 'assets', 'macos', 'record')
    const sourcePath = path.join(APP_ROOT, 'assets', 'macos', 'record')
    
    // Check if file exists in dist-electron (built by vite plugin)
    if (fs.existsSync(distPath)) {
      return distPath
    }
    // Fallback to source location
    return sourcePath
  }

  // prod: inside the .app Resources
  return path.join(process.resourcesPath, 'record', 'record');
}

export function startRecording() {
    // Stop existing process if running
    console.log(childProcess);
    if (!childProcess) {
      // Get user's file_dir from database
      const user = getUser();
      console.log("User:", user);
      const file_dir = user?.file_dir || DEFAULT_FILE_DIR; 
      
      const executablePath = getRecording();
      
    
      childProcess = spawn(
        executablePath,
        ["--file-dir", file_dir],
        {
          stdio: ["inherit", "inherit", "inherit"],
        }
      );
    
      childProcess?.on("error", (error) => {
        console.error("Failed to start Python script:", error);
        if (error.message.includes("Screen capture not allowed")) {
            setScreenRecordingNotAllowed();
            return;
        }
        childProcess = null;
      });
    
      childProcess?.on("exit", (code) => {
        console.log(`Python script exited with code ${code}`);
        childProcess = null;
      });
    
      childProcess?.unref(); // let Python run independently
    
    } else {
      console.log("Python script already running");
    }
  
  
  }
  
export function stopRecording() {
    if (childProcess) {
      console.log("Stopping Python script...");
      try {
        // Try graceful kill first
        if (!childProcess.killed) {
          childProcess.kill();
          
          // Force kill after a short delay if still running
          setTimeout(() => {
            if (childProcess && !childProcess.killed) {
              console.log("Force killing Python script...");
              try {
                childProcess.kill('SIGKILL');
              } catch (e) {
                // SIGKILL might not be available on all platforms
                childProcess.kill();
              }
            }
          }, 1000);
        }
        childProcess = null;
      } catch (error) {
        console.error('Error stopping Python script:', error);
        childProcess = null;
      }
    } else {
      console.log("No Python script running to stop");
    }
  }
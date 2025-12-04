import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { getUser } from '../ipc/db'

let pythonProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')

function getRecording() {
    if (!app.isPackaged) {
       // dev: try dist-electron first (where vite plugin copies it), then fallback to source
       const distPath = path.join(APP_ROOT, 'dist-electron', 'main', 'record.py')
       const sourcePath = path.join(APP_ROOT, 'electron', 'main', 'record.py')
       
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

export function startRecording() {
    // Stop existing process if running
    if (!pythonProcess) {
      // Get user's file_dir from database
      const user = getUser();
      console.log("User:", user);
      const file_dir = user?.file_dir; 
      
      const scriptPath = getRecording();
      console.log(`Starting Python script from: ${scriptPath}`);
      const scriptDir = path.dirname(scriptPath);
      
      const uvCmd = "uv"
    
      pythonProcess = spawn(
        uvCmd,
        ["run", "python", scriptPath, "--file-dir", file_dir],
        {
          cwd: scriptDir,            // so uv sees pyproject.toml
          stdio: ["inherit", "inherit", "inherit"],
        }
      );
    
      pythonProcess.on("error", (error) => {
        console.error("Failed to start Python script:", error);
        pythonProcess = null;
      });
    
      pythonProcess.on("exit", (code) => {
        console.log(`Python script exited with code ${code}`);
        pythonProcess = null;
      });
    
      pythonProcess.unref(); // let Python run independently
    
      console.log(`Python script started in background from: ${scriptDir}`);
    } else {
      console.log("Python script already running");
    }
  
  
  }
  
export function stopRecording() {
    if (pythonProcess) {
      console.log("Stopping Python script...");
      pythonProcess.kill();
      pythonProcess = null;
    } else {
      console.log("No Python script running to stop");
    }
  }
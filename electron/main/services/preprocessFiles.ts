import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'


let pythonProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')

function getPreprocessScript() {
    // dev: try dist-electron first (where vite plugin copies it), then fallback to source
    const distPath = path.join(APP_ROOT, 'dist-electron', 'main', 'ocr_check.py')
    const sourcePath = path.join(APP_ROOT, 'electron', 'main', 'ocr_check.py')
    
    // Check if file exists in dist-electron (built by vite plugin)
    if (fs.existsSync(distPath)) {
        return distPath
    }
    // Fallback to source location
    return sourcePath
  }

export function startPreprocess(file_dir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop existing process if running
      if (!pythonProcess) {
        const scriptPath = getPreprocessScript();
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
      
        pythonProcess?.on("error", (error) => {
          console.error("Failed to start Python script:", error);
          pythonProcess = null;
          reject(error);
        });
      
        pythonProcess?.on("exit", (code) => {
          console.log(`Python script exited with code ${code}`);
          pythonProcess = null;
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Python script exited with code ${code}`));
          }
        });
      
        // Don't use unref() since we want to wait for the process to complete
        console.log(`Python script started from: ${scriptDir}`);
      } else {
        console.log("Python script already running");
        resolve(); // Resolve immediately if already running
      }
    });
  }

export function stopPreprocess() {
  if (pythonProcess && !pythonProcess.killed) {
    try {
      pythonProcess.kill();
      pythonProcess = null;
    } catch (error) {
      console.error('Error killing preprocess process:', error);
    }
  }
}
  
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'


let childProcess: ChildProcess | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')

function getPreprocessScript() {
  if (!app.isPackaged) {
    // dev: try dist-electron first (where vite plugin copies it), then fallback to source
    const distPath = path.join(APP_ROOT, 'dist-electron', 'assets', 'macos', 'ocr_check')
    const sourcePath = path.join(APP_ROOT, 'assets', 'macos', 'ocr_check')
    
    // Check if file exists in dist-electron (built by vite plugin)
    if (fs.existsSync(distPath)) {
      return distPath
    }
    // Fallback to source location
    return sourcePath
  }

  // prod: inside the .app Resources
  return path.join(process.resourcesPath, 'ocr', 'ocr_check.py');
}

export function startPreprocess(file_dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stop existing process if running
    const executablePath = getPreprocessScript();
    console.log(`Starting ocr_check executable from: ${executablePath}`);
  
    childProcess = spawn(
      executablePath,
      ["--output-dir", file_dir],
      {
        stdio: ["inherit", "inherit", "inherit"],
      }
    );
  
    childProcess?.on("error", (error) => {
      console.error("Failed to start ocr_check executable:", error);
      childProcess = null;
      reject(error);
    });
  
    childProcess?.on("exit", (code) => {
      console.log(`ocr_check executable exited with code ${code}`);
      childProcess = null;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ocr_check executable exited with code ${code}`));
      }
    });
  
    // Don't use unref() since we want to wait for the process to complete
    console.log(`ocr_check executable started`);
  });
}

export function stopPreprocess() {
  if (childProcess && !childProcess.killed) {
    try {
      childProcess.kill();
      childProcess = null;
      console.log("ocr_check executable stopped");
    } catch (error) {
      console.error('Error killing ocr_check executable:', error);
      childProcess = null;
    }
  } else {
    console.log("No ocr_check executable running to stop");
  }
}
  
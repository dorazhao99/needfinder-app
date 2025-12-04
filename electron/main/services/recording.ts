import path from 'node:path'
import { spawn } from 'node:child_process'
import { ChildProcess } from 'node:child_process'

let pythonProcess: ChildProcess | null = null;

export function startRecording() {
    // Stop existing process if running
    if (!pythonProcess) {
      const scriptPath = path.join(__dirname, "record.py");
      const scriptDir = path.dirname(scriptPath);
      
      const uvCmd = "uv"
    
      pythonProcess = spawn(
        uvCmd,
        ["run", "python", scriptPath],
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
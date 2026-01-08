import { ChildProcess } from 'node:child_process'
import { startRecording } from './recording'
import { setScreenRecordingNotAllowed } from '../index'
import { spawn } from 'node:child_process'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { callLLM } from './llm'
import { getUser } from '../ipc/db'
import { showLongNotification } from '../ipc/ipc'


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '../..')

let childProcess: ChildProcess | null = null;



function getScreenshot() {
    if (!app.isPackaged) {
      // dev: try dist-electron first (where vite plugin copies it), then fallback to source
      const distPath = path.join(APP_ROOT, 'dist-electron', 'assets', 'macos', 'screenshot')
      const sourcePath = path.join(APP_ROOT, 'assets', 'macos', 'screenshot')
      
      // Check if file exists in dist-electron (built by vite plugin)
      if (fs.existsSync(distPath)) {
        return distPath
      }
      // Fallback to source location
      return sourcePath
    }
  
    // prod: inside the .app Resources
    return path.join(process.resourcesPath, 'screenshot', 'screenshot');
}

async function takeScreenshot() {
    console.log("Taking screenshot...");
    const executablePath = getScreenshot();
   
    const screenshotPath = path.join(os.homedir(), '.cache', 'recordr_screenshot.jpg');
  
    return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        childProcess = spawn(
          executablePath,
          // ["--output-dir", screenshotPath],
          {
            stdio: ["inherit", "inherit", "inherit"],
          }
        );
      
        childProcess.on("error", (error) => {
          console.error("Failed to start Python script:", error);
          childProcess = null;
          if (!resolved) {
              resolved = true;
              if (error.message.includes("Screen capture not allowed")) {
                  setScreenRecordingNotAllowed();
              }
              reject(error);
          }
        });
      
        childProcess.on("exit", (code) => {
          console.log(`Python script exited with code ${code}`);
          
          if (code !== 0) {
              childProcess = null;
              if (!resolved) {
                  resolved = true;
                  reject(new Error(`Python script exited with code ${code}`));
              }
              return;
          }
          
          // Wait for the file to exist
          const checkFile = () => {
              if (resolved) return;
              
              if (fs.existsSync(screenshotPath)) {
                  console.log(`Screenshot saved to: ${screenshotPath}`);
                  childProcess = null;
                  resolved = true;
                  resolve();
              } else {
                  // Check again after a short delay
                  setTimeout(checkFile, 100);
              }
          };
          
          // Start checking immediately
          checkFile();
          
          // Timeout after 1 seconds
          setTimeout(() => {
              if (!resolved) {
                  childProcess = null;
                  resolved = true;
                  reject(new Error("Timeout waiting for screenshot file to be created"));
              }
          }, 1000);
        });
    });
}
 
export async function inferActions() {
    console.log("Inferring actions...");
    const user = getUser();
    const name = user?.name || '';
    const prompt = `
        I have the following SCREENSHOT that the current user ${name} is working on:

        Now, employ the following reasoning framework when inferring the goals.

        0. Use context clues to infer what application the user is viewing and what they might be doing in that application. If they are looking at text, are they the direct author of the text, or are they viewing it as a reader? Are they actively editing the text, providing feedback, or synthesizing the content?

        1. Identify the genre of what the user is working on and their stage of completion. Map the content's genre and completion stage to common goals users of these genres and stages may have, and form an initial hypothesis of what the user's goals may be.

        2. Infer who the intended audience of the content is. Based on how you think the user wants their audience to receive their content, update your goal hypothesis.

        3. Think about what an ideal version of the user's current content would look like and identify what is missing. Then, use this to update your goal hypothesis.

        4. Think about what the user may need assistance with. Then, use this to update your goal hypothesis.

        For each step in your reasoning, briefly write out your thought process, your current hypothesis of the goals as a numbered list, and what the updated list would be after your reasoning.

        After you are done, finalize the most important goals. Make sure these goals are distinct and have minimal overlap. 

        Please respond with ONLY a brief description (2-3 sentences) of the user's goals.
    `
    

    if (childProcess !== null) {
        // stop existing process (recording)
        childProcess.kill();
        childProcess = null;
    } 

    await takeScreenshot();
    const fpath = path.join(os.homedir(), '.cache', 'recordr_screenshot.jpg');
    console.log(`Reading screenshot from: ${fpath}`);
    
    const imageBuffer = fs.readFileSync(fpath);
    const base64Image = imageBuffer.toString("base64");
    
    const content = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            "url": `data:image/jpeg;base64,${base64Image}`,
          },
        }
    ]
    console.log("Content:", content);

    const result = await callLLM(content, "gpt-4.1-mini");

    if (result.success && result.content) {
      showLongNotification('Action Inference Complete', 'Open Recordr to get agent solutions.');
    } else {
      showLongNotification('Error', result.error || 'Failed to infer actions.');
    }
    return result
}
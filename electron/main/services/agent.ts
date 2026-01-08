import { isEmptyString } from '@/utils';
import { spawn } from 'node:child_process';
import { ChildProcess } from 'node:child_process';
import { saveAgentResponse } from '../ipc/db';
let pythonProcess: ChildProcess | null = null;


function isEmptyString(str: string): boolean {
    // Remove all quotes (single and double) and whitespace
    const cleaned = str.replace(/["'\s]/g, '');
    return cleaned.length === 0;
}

export function callMCPAgent(prompt: string, solution_id: number): Promise<{status: string, result?: any, error?: string}> {
    return new Promise((resolve, reject) => {
        const projectPath = "/Users/dorazhao/Documents/modelgardens-agents"
        const args = ["--task", prompt]
        
        pythonProcess = spawn('uv', ['run', 'python', '-u', '-m', 'modelgarden.cli.mcp_agent_cli', ...args], {
            cwd: projectPath,
            env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });

        let outputData = '';
        let errorData = '';

        pythonProcess?.stdout?.on('data', (data) => {
            const chunk = data.toString();
            console.log(`Agent log: ${chunk.trim()}`);
            outputData += chunk;
        });

        pythonProcess?.stderr?.on('data', (data) => {
            const chunk = data.toString();
            console.error(`Agent stderr: ${chunk}`);
            errorData += chunk;
        });

        pythonProcess?.on("error", (error) => {
            console.error("Failed to start Python script:", error);
            reject(error);
            pythonProcess = null;
        });
        
        pythonProcess?.on("exit", (code) => {
            console.log(`Python script exited with code ${code}`);
            
            try {
                // Get the last line (which should be the JSON output)
                const lines = outputData.trim().split('\n');
                console.log('Lines', lines);
                const lastLine = lines[lines.length - 1];
                const result = JSON.parse(lastLine);
                

                if (result.status === "success") {
                    // save agent response to db
                    const artifactPath = result.result.artifact_uri;
                    const isArtifact = isEmptyString(artifactPath);
                    const savedArtifact = isArtifact ? artifactPath : "";
                    saveAgentResponse({
                        solution_id: solution_id,
                        agent_response: result.result.message,
                        artifact_path: savedArtifact,
                    });
                    resolve(result);
                } else {
                    // Python caught an exception
                    reject(new Error(result.error));
                }
            } catch (error) {
                console.error('Error:', error);
                reject(new Error(`Failed to parse output: ${outputData}`));
            }
            
            pythonProcess = null;
        });
    });
}

export function stopAgent() {
  if (pythonProcess && !pythonProcess.killed) {
    try {
      pythonProcess.kill();
      pythonProcess = null;
    } catch (error) {
      console.error('Error killing agent process:', error);
    }
  }
}


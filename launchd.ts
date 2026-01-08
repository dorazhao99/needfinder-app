#!/usr/bin/env node


import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export interface LaunchAgentOptions {
  label: string;
  hour: number;
  minute: number;
  isTest?: boolean;
  daysToRun?: number; // Number of days to run before auto-uninstalling (optional)
}

export interface LaunchAgentResult {
  plistPath: string;
  runnerScript: string;
  nodePath: string;
}

/**
 * Get the path to Node.js executable
 */
function getNodePath(): string {
  // Try to find node in common locations
  try {
    const nodePath = execSync('which node', { encoding: 'utf-8' }).trim();
    if (nodePath && fs.existsSync(nodePath)) {
      return nodePath;
    }
  } catch (e) {
    // Fall through
  }

  // Fallback to common locations
  const commonPaths = [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
  ];

  for (const nodePath of commonPaths) {
    if (fs.existsSync(nodePath)) {
      return nodePath;
    }
  }

  throw new Error('Could not find Node.js executable. Please ensure Node.js is installed.');
}

/**
 * Get the path to the script to run
 */
function getScriptPath(isTest: boolean): string {
  const scriptName = isTest ? 'insight-creator.dev.js' : 'insight-creator.js';
  
  // In development, the script is in electron/main
  // In production, it would be in the app's Resources folder
  const devPath = path.join(process.resourcesPath || process.cwd(), 'electron', 'main', scriptName);
  const distPath = path.join(process.resourcesPath || process.cwd(), 'dist-electron', 'main', scriptName);
  
  // Check if script exists in development location
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  
  // Check if script exists in dist location
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  
  throw new Error(`Could not find ${scriptName}. Checked:\n  - ${devPath}\n  - ${distPath}`);
}

/**
 * Create a wrapper script that runs the Node.js script
 */
function createRunnerScript(
  scriptPath: string,
  nodePath: string,
  label: string,
  daysToRun?: number
): string {
  // Use a stable path based on the label
  const runnerScript = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.sh`);
  const installDateFile = path.join(os.tmpdir(), `${label}.install_date.json`);
  const uninstallScript = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.uninstall.sh`);
  
  // Create uninstall script that can be called from the wrapper
  const uninstallScriptContent = `#!/bin/bash
# Uninstall script for launchd agent
# Generated automatically - do not edit manually

LABEL="${label}"
PLIST="$HOME/Library/LaunchAgents/${label}.plist"
RUNNER="$HOME/Library/LaunchAgents/${label}.sh"
INSTALL_DATE_FILE="${installDateFile}"

# Unload the agent
launchctl unload "$PLIST" 2>/dev/null || true

# Remove files
rm -f "$PLIST" "$RUNNER" "$INSTALL_DATE_FILE"

exit 0
`;

  fs.writeFileSync(uninstallScript, uninstallScriptContent, { mode: 0o755 });
  
  // Create the main runner script with expiration check
  let expirationCheck = '';
  if (daysToRun && daysToRun > 0) {
    expirationCheck = `
# Check if expiration date has passed
INSTALL_DATE_FILE="${installDateFile}"
UNINSTALL_SCRIPT="${uninstallScript}"
NODE_PATH="${nodePath}"

if [ -f "$INSTALL_DATE_FILE" ]; then
  INSTALL_TIMESTAMP=$("$NODE_PATH" -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('$INSTALL_DATE_FILE','utf8')); console.log(data.installDate);" 2>/dev/null)
  if [ -n "$INSTALL_TIMESTAMP" ]; then
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_ELAPSED=$(( ($CURRENT_TIMESTAMP - $INSTALL_TIMESTAMP) / 86400 ))
    
    if [ $DAYS_ELAPSED -ge ${daysToRun} ]; then
      echo "Launchd agent expired after ${daysToRun} days. Uninstalling..."
      bash "$UNINSTALL_SCRIPT"
      exit 0
    fi
  fi
fi
`;
  }
  
  const scriptContent = `#!/bin/bash
# Wrapper script for launchd to run insight-creator
# Generated automatically - do not edit manually
${expirationCheck}
export PATH="${path.dirname(nodePath)}:$PATH"
cd "${path.dirname(scriptPath)}"
"${nodePath}" "${scriptPath}"

exit $?
`;

  fs.writeFileSync(runnerScript, scriptContent, { mode: 0o755 });
  return runnerScript;
}

/**
 * Create launchd plist file
 */
function createPlistFile(
  label: string,
  runnerScript: string,
  hour: number,
  minute: number
): string {
  const homeDir = os.homedir();
  const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
  
  // Ensure LaunchAgents directory exists
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }
  
  const plistPath = path.join(launchAgentsDir, `${label}.plist`);
  
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>${runnerScript}</string>
  </array>
  
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${hour}</integer>
    <key>Minute</key>
    <integer>${minute}</integer>
  </dict>
  
  <key>StandardOutPath</key>
  <string>/tmp/${label}.out.log</string>
  
  <key>StandardErrorPath</key>
  <string>/tmp/${label}.err.log</string>
  
  <key>RunAtLoad</key>
  <false/>
  
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
`;

  fs.writeFileSync(plistPath, plistContent);
  return plistPath;
}

/**
 * Install the launchd agent
 */
export function installNightlyLaunchAgent(options: LaunchAgentOptions): LaunchAgentResult {
  const { label, hour, minute, isTest = false, daysToRun } = options;
  
  // Validate hour and minute
  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid hour: ${hour}. Must be between 0 and 23.`);
  }
  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid minute: ${minute}. Must be between 0 and 59.`);
  }
  
  // Get paths
  const nodePath = getNodePath();
  const scriptPath = getScriptPath(isTest);
  
  // Store installation date if expiration is set
  if (daysToRun && daysToRun > 0) {
    const installDateFile = path.join(os.tmpdir(), `${label}.install_date.json`);
    const installTimestamp = Math.floor(Date.now() / 1000);
    fs.writeFileSync(
      installDateFile,
      JSON.stringify({ installDate: installTimestamp, daysToRun }, null, 2)
    );
  }
  
  // Create runner script
  const runnerScript = createRunnerScript(scriptPath, nodePath, label, daysToRun);
  
  // Create plist file
  const plistPath = createPlistFile(label, runnerScript, hour, minute);
  
  // Unload existing agent if it exists
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null || true`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors if agent doesn't exist
  }
  
  // Load the new agent
  try {
    execSync(`launchctl load "${plistPath}"`, { stdio: 'inherit' });
  } catch (e) {
    throw new Error(`Failed to load launchd agent: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  return {
    plistPath,
    runnerScript,
    nodePath,
  };
}

/**
 * Uninstall the launchd agent
 */
export function uninstallNightlyLaunchAgent(label: string): void {
  const homeDir = os.homedir();
  const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', `${label}.plist`);
  const runnerScript = path.join(homeDir, 'Library', 'LaunchAgents', `${label}.sh`);
  const uninstallScript = path.join(homeDir, 'Library', 'LaunchAgents', `${label}.uninstall.sh`);
  const installDateFile = path.join(os.tmpdir(), `${label}.install_date.json`);
  
  if (!fs.existsSync(plistPath)) {
    console.log(`Launchd agent ${label} not found. Nothing to uninstall.`);
    // Still try to remove related files if they exist
    [runnerScript, uninstallScript, installDateFile].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (e) {
          // Ignore errors
        }
      }
    });
    return;
  }
  
  // Unload the agent
  try {
    execSync(`launchctl unload "${plistPath}"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn(`Warning: Failed to unload launchd agent: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // Remove the plist file
  try {
    fs.unlinkSync(plistPath);
  } catch (e) {
    throw new Error(`Failed to remove plist file: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // Remove related files
  [runnerScript, uninstallScript, installDateFile].forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.warn(`Warning: Failed to remove ${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  });
  
  console.log(`✓ Launchd agent ${label} uninstalled successfully.`);
}


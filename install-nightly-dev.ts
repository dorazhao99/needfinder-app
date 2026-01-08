#!/usr/bin/env node

/**
 * Script to install a launchd agent that runs insight-creator.dev.js every night at 1AM
 * 
 * Usage:
 *   npx tsx electron/main/install-nightly-dev.ts
 *   or
 *   node dist-electron/main/install-nightly-dev.js (after building)
 */

import { installNightlyLaunchAgent } from './launchd.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Verify the script exists (for development)
// In development, the insight-creator.dev.js is in the electron/main directory
// In production, it would be in the app's Resources folder
const devScript = path.join(__dirname, 'insight-creator.dev.js');
const distScript = path.join(__dirname, '..', '..', 'dist-electron', 'main', 'insight-creator.dev.js');

if (!fs.existsSync(devScript) && !fs.existsSync(distScript)) {
  console.error(`Error: Could not find insight-creator.dev.js`);
  console.error(`  Checked: ${devScript}`);
  console.error(`  Checked: ${distScript}`);
  process.exit(1);
}

try {
  console.log('Installing launchd agent for insight-creator.dev.js...');
  console.log('This will run every night at 1:00 AM');
  
  const result = installNightlyLaunchAgent({
    label: 'com.stanfordhci.recordr.nightly.dev',
    hour: 1,
    minute: 0,
    isTest: true, // Use insight-creator.dev.js
    daysToRun: 4, // Auto-uninstall after 4 days
  });

  console.log('✓ Launchd agent installed successfully!');
  console.log(`  Plist: ${result.plistPath}`);
  console.log(`  Runner: ${result.runnerScript}`);
  console.log(`  Node: ${result.nodePath}`);
  console.log('\nThe agent will run every night at 1:00 AM.');
  console.log('Check logs at:');
  console.log(`  - /tmp/${result.plistPath.split('/').pop()?.replace('.plist', '')}.out.log`);
  console.log(`  - /tmp/${result.plistPath.split('/').pop()?.replace('.plist', '')}.err.log`);
} catch (error) {
  console.error('✗ Failed to install launchd agent:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}


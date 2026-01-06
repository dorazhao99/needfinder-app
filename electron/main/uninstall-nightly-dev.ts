#!/usr/bin/env node

/**
 * Script to uninstall the launchd agent for insight-creator.dev.js
 * 
 * Usage:
 *   npx tsx electron/main/uninstall-nightly-dev.ts
 *   or
 *   node dist-electron/main/uninstall-nightly-dev.js (after building)
 */

import { uninstallNightlyLaunchAgent } from './launchd.js';

const LABEL = 'com.stanfordhci.recordr.nightly.dev';

try {
  console.log('Uninstalling launchd agent for insight-creator.dev.js...');
  uninstallNightlyLaunchAgent(LABEL);
} catch (error) {
  console.error('✗ Failed to uninstall launchd agent:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}


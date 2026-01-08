#!/bin/bash

# Script to uninstall the launchd agent for insight-creator.dev.js

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Uninstalling launchd agent for insight-creator.dev.js..."
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install Node.js first."
  exit 1
fi

# Run the uninstall script
cd "$SCRIPT_DIR"
npx tsx electron/main/uninstall-nightly-dev.ts

echo ""
echo "Uninstallation complete!"


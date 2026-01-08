#!/bin/bash

# Script to install the launchd agent for insight-creator.dev.js
# This will run the script every night at 1:00 AM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing launchd agent for insight-creator.dev.js..."
echo "This will run every night at 1:00 AM"
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install Node.js first."
  exit 1
fi

# Run the install script
cd "$SCRIPT_DIR"
npx tsx electron/main/install-nightly-dev.ts

echo ""
echo "Installation complete!"
echo ""
echo "To uninstall, run: ./uninstall-nightly-dev.sh"
echo "To check logs, see: /tmp/com.yourcompany.yourapp.nightly.dev.out.log"
echo "                     /tmp/com.yourcompany.yourapp.nightly.dev.err.log"


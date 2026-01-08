#!/bin/bash

APP="dist/mac-arm64/Lilac.app/"   
BIN="$APP/Contents/MacOS/Lilac"
ELECTRON_RUN_AS_NODE=1 "$BIN" insight-creator.js --test

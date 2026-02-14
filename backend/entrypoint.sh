#!/bin/bash
set -e

# Pre-install npm MCP packages from optional config file
MCP_PACKAGES="/root/.claude/mcp-packages.txt"
if [ -f "$MCP_PACKAGES" ]; then
  echo "Installing MCP packages from $MCP_PACKAGES..."
  xargs npm install -g < "$MCP_PACKAGES"
fi

# Pre-install apk system packages from optional config file
APK_PACKAGES="/root/.claude/apk-packages.txt"
if [ -f "$APK_PACKAGES" ]; then
  echo "Installing system packages from $APK_PACKAGES..."
  xargs apk add --no-cache < "$APK_PACKAGES"
fi

# Start the backend
exec node dist/backend/src/index.js

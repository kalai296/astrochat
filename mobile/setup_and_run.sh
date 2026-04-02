#!/bin/bash

# ── AstroChat Mobile — One-click setup & launch (SDK 54) ─────────────────────
# Run: bash setup_and_run.sh
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   AstroChat Mobile — Setup & Launch      ║"
echo "║   Expo SDK 54 · React Native 0.76        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Fix macOS file watcher limit
echo "▶ Step 1/6 — Fixing macOS file watcher limit..."
sudo launchctl limit maxfiles 65536 200000 2>/dev/null || true
ulimit -n 65536 2>/dev/null || true
echo "   ✓ Done"

# 2. Fix npm global PATH so ngrok is found
echo "▶ Step 2/6 — Fixing npm global PATH..."
export PATH="$(npm config get prefix)/bin:$PATH"
echo "   ✓ PATH = $PATH"

# 3. Install ngrok globally
echo "▶ Step 3/6 — Installing @expo/ngrok globally..."
npm install -g @expo/ngrok@^4.1.0 2>/dev/null || true
echo "   ✓ Done"

# 4. Fix watchman
echo "▶ Step 4/6 — Fixing watchman..."
if command -v watchman &> /dev/null; then
  watchman watch-del '/Users/kalaimani.r/Desktop/astrochat/mobile' 2>/dev/null || true
  watchman watch-project '/Users/kalaimani.r/Desktop/astrochat/mobile' 2>/dev/null || true
  echo "   ✓ Watchman fixed"
else
  echo "   ⚠ watchman not found — installing via brew..."
  brew install watchman 2>/dev/null || true
fi

# 5. Clean install all dependencies
echo "▶ Step 5/6 — Clean installing dependencies for SDK 54..."
cd "$(dirname "$0")"
rm -rf node_modules package-lock.json .expo
npm install --legacy-peer-deps
echo "   ✓ Done"

# 6. Start with tunnel (auto-confirm ngrok install)
echo ""
echo "▶ Step 6/6 — Starting Expo Go tunnel..."
echo ""
echo "   📱 Scan the QR code with Expo Go on your iPhone"
echo "   ⚡ Using SDK 54.0.0 — matches your installed Expo Go"
echo "   ℹ  Press Ctrl+C to stop"
echo ""

# Use 'yes' to auto-answer the ngrok prompt
yes | npx expo start --clear --tunnel

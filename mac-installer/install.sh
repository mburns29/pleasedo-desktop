#!/bin/bash
# PleaseDo Desktop - macOS Installer
set -e

echo "========================================"
echo "   PleaseDo Desktop - macOS Setup      "
echo "========================================"
echo ""

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
fi

echo "Node.js: $(node --version)"

# Install Clawdbot
echo "Installing Clawdbot..."
npm install -g clawdbot

echo "Clawdbot: $(clawdbot --version)"
echo ""

# Create workspace
WORKSPACE="$HOME/clawdbot-workspace"
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

echo "========================================"
echo "   Starting Setup Wizard               "
echo "========================================"
echo ""
echo "You'll need an Anthropic API key."
echo "Get one at: https://console.anthropic.com"
echo ""

clawdbot configure

echo ""
echo "========================================"
echo "   Setup Complete!                     "
echo "========================================"
echo ""
echo "To start: clawdbot gateway start"
echo "To chat:  clawdbot chat"
echo ""

read -p "Start Clawdbot now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clawdbot gateway start
fi

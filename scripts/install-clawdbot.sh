#!/bin/bash
# Clawdbot Installation Script
# Works on: Ubuntu/Debian, WSL2, or VM
set -e

echo "========================================"
echo "   PleaseDo Desktop - Clawdbot Setup   "
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please don't run as root. Run as normal user.${NC}"
    exit 1
fi

# Detect environment
if grep -qi microsoft /proc/version 2>/dev/null; then
    ENV_TYPE="WSL"
    echo -e "${GREEN}Detected: Windows Subsystem for Linux${NC}"
elif [ -f /sys/class/dmi/id/product_name ] && grep -qi virtualbox /sys/class/dmi/id/product_name 2>/dev/null; then
    ENV_TYPE="VM"
    echo -e "${GREEN}Detected: VirtualBox VM${NC}"
else
    ENV_TYPE="Linux"
    echo -e "${GREEN}Detected: Native Linux${NC}"
fi
echo ""

# Check for Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js found: $NODE_VERSION${NC}"
else
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}Node.js installed: $(node --version)${NC}"
fi
echo ""

# Install Clawdbot
echo "Installing Clawdbot..."
sudo npm install -g clawdbot
echo -e "${GREEN}Clawdbot installed: $(clawdbot --version)${NC}"
echo ""

# Create workspace
WORKSPACE="$HOME/clawdbot-workspace"
mkdir -p "$WORKSPACE"
echo "Created workspace: $WORKSPACE"
echo ""

# Run Clawdbot configuration wizard
echo "========================================"
echo "   Starting Clawdbot Setup Wizard      "
echo "========================================"
echo ""
echo "You'll need:"
echo "  1. Anthropic API key (get one at console.anthropic.com)"
echo "  2. (Optional) Telegram bot token"
echo ""
read -p "Press Enter to start the wizard..."

cd "$WORKSPACE"
clawdbot configure

echo ""
echo "========================================"
echo -e "${GREEN}   Setup Complete!${NC}"
echo "========================================"
echo ""
echo "To start Clawdbot:"
echo "  cd $WORKSPACE"
echo "  clawdbot gateway start"
echo ""
echo "To chat via terminal:"
echo "  clawdbot chat"
echo ""

# Offer to start now
read -p "Start Clawdbot now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting Clawdbot gateway..."
    clawdbot gateway start
    echo ""
    echo "Clawdbot is running!"
    if [ "$ENV_TYPE" = "WSL" ]; then
        echo "Access web interface at: http://localhost:18789"
    fi
fi

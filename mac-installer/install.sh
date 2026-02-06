#!/bin/bash
# PleaseDo Desktop - macOS Installer
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
DIM='\033[2m'

step_num=0
total_steps=4

step() {
    step_num=$((step_num + 1))
    echo ""
    echo -e "${CYAN}[$step_num/$total_steps] $1${NC}"
    echo -e "${DIM}──────────────────────────────────────────${NC}"
}

success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

info() {
    echo -e "  ${NC}→${NC} $1"
}

warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

fail() {
    echo -e "  ${RED}✗${NC} $1"
    exit 1
}

clear
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     PleaseDo Desktop - macOS Setup       ║${NC}"
echo -e "${MAGENTA}║         Clawdbot for Everyone            ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 1: Homebrew
# ═══════════════════════════════════════════════════════════════
step "Homebrew Package Manager"

if command -v brew &> /dev/null; then
    success "Homebrew is installed"
else
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to path for Apple Silicon
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    fi
    
    success "Homebrew installed"
fi

# ═══════════════════════════════════════════════════════════════
# Step 2: Node.js
# ═══════════════════════════════════════════════════════════════
step "Node.js Runtime"

if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    success "Node.js is installed ($NODE_VER)"
else
    info "Installing Node.js..."
    brew install node
    success "Node.js installed ($(node --version))"
fi

# ═══════════════════════════════════════════════════════════════
# Step 3: Clawdbot
# ═══════════════════════════════════════════════════════════════
step "Clawdbot AI Agent"

info "Installing Clawdbot..."
npm install -g clawdbot 2>/dev/null || sudo npm install -g clawdbot

if command -v clawdbot &> /dev/null; then
    CLAWD_VER=$(clawdbot --version)
    success "Clawdbot installed ($CLAWD_VER)"
else
    fail "Clawdbot installation failed"
fi

# ═══════════════════════════════════════════════════════════════
# Step 4: Setup
# ═══════════════════════════════════════════════════════════════
step "Configuration"

# Create workspace
WORKSPACE="$HOME/clawdbot-workspace"
mkdir -p "$WORKSPACE"
success "Workspace created: $WORKSPACE"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Installation Complete! 🎉         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo ""
echo -e "  1. Run: ${CYAN}clawdbot configure${NC}"
echo -e "  2. Enter your Anthropic API key"
echo -e "  3. Run: ${CYAN}clawdbot gateway start${NC}"
echo ""
echo -e "  Get your API key at: ${CYAN}https://console.anthropic.com${NC}"
echo ""

# Offer to configure now
read -p "  Configure Clawdbot now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$WORKSPACE"
    echo ""
    clawdbot configure
    
    echo ""
    read -p "  Start Clawdbot? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clawdbot gateway start
    fi
fi

echo ""
echo -e "${GREEN}Done! Enjoy Clawdbot.${NC}"
echo ""

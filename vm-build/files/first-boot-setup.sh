#!/bin/bash
# PleaseDo Desktop - First Boot Setup Wizard
# Runs automatically on first login

SETUP_DONE="$HOME/.pleasedo-setup-complete"

# Skip if already configured
if [ -f "$SETUP_DONE" ]; then
    exit 0
fi

clear
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🤖 Welcome to PleaseDo Desktop!                         ║"
echo "║                                                              ║"
echo "║     Your personal AI agent, fully isolated and secure.      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "This wizard will help you configure Clawdbot."
echo ""
echo "You'll need:"
echo "  • Anthropic API key (get one at console.anthropic.com)"
echo "  • (Optional) Telegram bot token for mobile access"
echo ""
read -p "Press Enter to continue..."

# Create workspace
mkdir -p "$HOME/workspace"
cd "$HOME/workspace"

# Run Clawdbot configuration
echo ""
echo "Starting Clawdbot configuration..."
echo ""
clawdbot configure

# Mark setup complete
touch "$SETUP_DONE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Clawdbot is now configured!"
echo ""
echo "To start:  clawdbot gateway start"
echo "To chat:   clawdbot chat"
echo ""
echo "Your workspace: ~/workspace"
echo ""

read -p "Start Clawdbot now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    clawdbot gateway start &
    sleep 2
    echo ""
    echo "Clawdbot is running! Open a new terminal to use 'clawdbot chat'"
fi

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

# Lock down API key permissions (Security Fix #4)
echo ""
echo "Securing configuration files..."
if [ -d "$HOME/.config/clawdbot" ]; then
    chmod 700 "$HOME/.config/clawdbot"
    chmod 600 "$HOME/.config/clawdbot"/*.json 2>/dev/null || true
    chmod 600 "$HOME/.config/clawdbot"/*.yaml 2>/dev/null || true
    echo "✓ Config permissions locked (owner-only)"
fi

# Also secure the workspace
if [ -d "$HOME/workspace" ]; then
    chmod 700 "$HOME/workspace"
fi

# Mark setup complete
touch "$SETUP_DONE"

# Security verification
echo ""
echo "Running security checks..."
SECURITY_OK=true

# Check SSH hardening
if grep -q "PasswordAuthentication no" /etc/ssh/sshd_config 2>/dev/null; then
    echo "✓ SSH password auth disabled"
else
    echo "⚠ SSH password auth may be enabled"
    SECURITY_OK=false
fi

# Check firewall
if sudo ufw status | grep -q "Status: active" 2>/dev/null; then
    echo "✓ Firewall enabled"
else
    echo "⚠ Firewall not active"
    SECURITY_OK=false
fi

# Check config permissions
if [ -d "$HOME/.config/clawdbot" ]; then
    PERMS=$(stat -c %a "$HOME/.config/clawdbot" 2>/dev/null)
    if [ "$PERMS" = "700" ]; then
        echo "✓ Config directory secured"
    else
        echo "⚠ Config directory permissions: $PERMS (should be 700)"
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Clawdbot is now configured!"
if [ "$SECURITY_OK" = true ]; then
    echo "Security: ✓ All checks passed"
else
    echo "Security: ⚠ Some checks need attention (see above)"
fi
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

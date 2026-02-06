# PleaseDo Desktop

**Clawdbot for Everyone** - Run your own AI agent locally in minutes.

---

## What is This?

PleaseDo Desktop gives you a full AI agent (Clawdbot) running on your computer. It can:
- Search the web and fetch information
- Read and write files
- Automate browser tasks
- Connect to Telegram for mobile access
- Run scheduled tasks
- And much more

No cloud required. Your data stays on your machine.

---

## Installation

### Windows

**Option A: Automated (Recommended)**

1. Open PowerShell **as Administrator**
2. Paste and run:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://pleasedo.ai/install.ps1 | iex
```

**Option B: Manual**

See [windows-installer/README.md](windows-installer/README.md)

---

### macOS

Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://pleasedo.ai/install-mac.sh)"
```

Or manually:
```bash
brew install node
npm install -g clawdbot
clawdbot configure
```

---

### Linux

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Clawdbot
sudo npm install -g clawdbot

# Configure
clawdbot configure

# Start
clawdbot gateway start
```

---

## What You Need

| Requirement | Where to Get It |
|-------------|-----------------|
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) |
| Telegram bot (optional) | [@BotFather](https://t.me/BotFather) |

---

## Usage

After installation:

```bash
# Start the agent
clawdbot gateway start

# Chat in terminal
clawdbot chat

# Or connect via Telegram (if configured)
```

---

## Project Structure

```
pleasedo-desktop/
├── windows-installer/   # Windows WSL-based installer
├── mac-installer/       # macOS installer
├── scripts/            # Shared setup scripts
└── README.md           # This file
```

---

## Status

- [x] Windows installer (WSL-based)
- [x] macOS installer
- [x] Linux instructions
- [ ] One-click download URLs (need hosting)
- [ ] VirtualBox VM option (for isolation)
- [ ] Auto-update mechanism

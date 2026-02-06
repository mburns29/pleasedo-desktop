# PleaseDo Desktop - Windows Installation

## Quick Install (Copy & Paste)

Open PowerShell **as Administrator** and paste:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
irm https://stackedrei.com/pleasedo-desktop/windows-installer/Install-PleaseDo.ps1 | iex
```

---

## Manual Install

### Step 1: Enable WSL2

Open PowerShell as Administrator:
```powershell
wsl --install
```

Restart your computer.

### Step 2: Install Ubuntu

```powershell
wsl --install -d Ubuntu
```

Open "Ubuntu" from Start menu and create a username/password.

### Step 3: Install Clawdbot

In Ubuntu terminal:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Clawdbot
sudo npm install -g clawdbot

# Configure
clawdbot configure
```

### Step 4: Start Clawdbot

```bash
clawdbot gateway start
```

---

## What You Need

- **Anthropic API key** - Get one at [console.anthropic.com](https://console.anthropic.com)
- **Telegram bot** (optional) - Create via [@BotFather](https://t.me/BotFather)

---

## Troubleshooting

### "WSL2 requires an update"
Download from: https://aka.ms/wsl2kernel

### "Ubuntu won't start"
Run in PowerShell: `wsl --set-default-version 2`

### "Permission denied"
Make sure you're running PowerShell as Administrator

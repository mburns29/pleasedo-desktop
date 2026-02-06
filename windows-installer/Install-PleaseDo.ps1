# PleaseDo Desktop - Windows Installer
# Run this in PowerShell as Administrator

$ErrorActionPreference = "Stop"

function Write-Step($step, $message) {
    Write-Host ""
    Write-Host "[$step] $message" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-Success($message) {
    Write-Host "  ✓ $message" -ForegroundColor Green
}

function Write-Info($message) {
    Write-Host "  → $message" -ForegroundColor White
}

function Write-Warn($message) {
    Write-Host "  ⚠ $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
    Write-Host "  ✗ $message" -ForegroundColor Red
}

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     PleaseDo Desktop - Windows Setup     ║" -ForegroundColor Magenta
Write-Host "║         Clawdbot for Everyone            ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# Step 0: Pre-flight checks
# ═══════════════════════════════════════════════════════════════
Write-Step "0/4" "Pre-flight checks"

# Check Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Fail "Not running as Administrator"
    Write-Info "Please right-click PowerShell and select 'Run as Administrator'"
    Write-Host ""
    pause
    exit 1
}
Write-Success "Running as Administrator"

# Check Windows version
$winVer = [System.Environment]::OSVersion.Version
$winBuild = $winVer.Build
if ($winBuild -lt 19041) {
    Write-Fail "Windows 10 version 2004 or later required (you have build $winBuild)"
    Write-Info "Please update Windows and try again"
    Write-Host ""
    pause
    exit 1
}
Write-Success "Windows version OK (build $winBuild)"

# ═══════════════════════════════════════════════════════════════
# Step 1: WSL
# ═══════════════════════════════════════════════════════════════
Write-Step "1/4" "Windows Subsystem for Linux"

try {
    $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    $vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
    
    if ($wslFeature.State -ne "Enabled" -or $vmFeature.State -ne "Enabled") {
        Write-Info "Installing WSL components..."
        
        if ($wslFeature.State -ne "Enabled") {
            dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
        }
        if ($vmFeature.State -ne "Enabled") {
            dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
        }
        
        Write-Success "WSL components installed"
        Write-Warn "RESTART REQUIRED"
        Write-Host ""
        Write-Host "  Please restart your computer, then run this script again." -ForegroundColor Yellow
        Write-Host ""
        pause
        exit 0
    }
    Write-Success "WSL is enabled"
    
    # Set WSL2 as default
    wsl --set-default-version 2 2>$null | Out-Null
    Write-Success "WSL2 set as default"
    
} catch {
    Write-Fail "WSL setup failed: $_"
    pause
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# Step 2: Ubuntu
# ═══════════════════════════════════════════════════════════════
Write-Step "2/4" "Ubuntu Linux"

$ubuntuInstalled = $false
try {
    $distros = wsl -l -q 2>$null
    if ($distros -match "Ubuntu") {
        $ubuntuInstalled = $true
    }
} catch {}

if (-not $ubuntuInstalled) {
    Write-Info "Installing Ubuntu (this takes 2-5 minutes)..."
    
    try {
        wsl --install -d Ubuntu --no-launch 2>&1 | Out-Null
        Write-Success "Ubuntu downloaded"
    } catch {
        Write-Fail "Ubuntu install failed: $_"
        pause
        exit 1
    }
    
    Write-Host ""
    Write-Warn "SETUP REQUIRED"
    Write-Host ""
    Write-Host "  1. Open 'Ubuntu' from the Start menu" -ForegroundColor White
    Write-Host "  2. Create a username and password when prompted" -ForegroundColor White
    Write-Host "  3. Close Ubuntu and run this script again" -ForegroundColor White
    Write-Host ""
    pause
    exit 0
}
Write-Success "Ubuntu is installed"

# ═══════════════════════════════════════════════════════════════
# Step 3: Clawdbot
# ═══════════════════════════════════════════════════════════════
Write-Step "3/4" "Installing Clawdbot"

$installScript = @'
#!/bin/bash
set -e

echo "Updating packages..."
sudo apt-get update -qq

echo "Installing Node.js 22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null 2>&1
    sudo apt-get install -y nodejs >/dev/null 2>&1
fi
echo "Node.js: $(node --version)"

echo "Installing Clawdbot..."
sudo npm install -g clawdbot >/dev/null 2>&1
echo "Clawdbot: $(clawdbot --version)"

echo "DONE"
'@

$scriptPath = "$env:TEMP\install-clawdbot.sh"
$installScript | Out-File -FilePath $scriptPath -Encoding utf8 -Force
(Get-Content $scriptPath) | Set-Content $scriptPath

Write-Info "Installing in Ubuntu (this takes 1-2 minutes)..."

try {
    $output = wsl -d Ubuntu -- bash -c "cat /mnt/c/Users/$env:USERNAME/AppData/Local/Temp/install-clawdbot.sh | tr -d '\r' | bash" 2>&1
    
    if ($output -match "DONE") {
        Write-Success "Clawdbot installed"
    } else {
        Write-Warn "Installation may have issues - check manually"
    }
} catch {
    Write-Fail "Installation failed: $_"
    pause
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# Step 4: Done!
# ═══════════════════════════════════════════════════════════════
Write-Step "4/4" "Complete!"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║       Installation Complete! 🎉         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Open 'Ubuntu' from the Start menu" -ForegroundColor White
Write-Host "  2. Run: " -NoNewline; Write-Host "clawdbot configure" -ForegroundColor Cyan
Write-Host "  3. Enter your Anthropic API key" -ForegroundColor White
Write-Host "  4. Run: " -NoNewline; Write-Host "clawdbot gateway start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Get your API key at: " -NoNewline
Write-Host "https://console.anthropic.com" -ForegroundColor Blue
Write-Host ""
pause

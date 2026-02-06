# PleaseDo Desktop - Windows Installer
# Run this in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PleaseDo Desktop - Windows Setup    " -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# Check Windows version
$winVer = [System.Environment]::OSVersion.Version
if ($winVer.Build -lt 19041) {
    Write-Host "Windows 10 version 2004 or later required for WSL2" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Step 1: Checking WSL..." -ForegroundColor Yellow

# Check if WSL is installed
$wslInstalled = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux

if ($wslInstalled.State -ne "Enabled") {
    Write-Host "Installing WSL..." -ForegroundColor Yellow
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
    
    Write-Host ""
    Write-Host "WSL installed! Please restart your computer and run this script again." -ForegroundColor Green
    pause
    exit 0
}

# Set WSL2 as default
wsl --set-default-version 2 2>$null

Write-Host "WSL is ready!" -ForegroundColor Green
Write-Host ""

# Check if Ubuntu is installed
Write-Host "Step 2: Checking Ubuntu..." -ForegroundColor Yellow
$ubuntuInstalled = wsl -l -q 2>$null | Where-Object { $_ -match "Ubuntu" }

if (-not $ubuntuInstalled) {
    Write-Host "Installing Ubuntu (this may take a few minutes)..." -ForegroundColor Yellow
    wsl --install -d Ubuntu --no-launch
    
    Write-Host ""
    Write-Host "Ubuntu installed!" -ForegroundColor Green
    Write-Host "Please complete these steps:" -ForegroundColor Yellow
    Write-Host "  1. Open 'Ubuntu' from the Start menu" -ForegroundColor White
    Write-Host "  2. Create a username and password when prompted" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    pause
    exit 0
}

Write-Host "Ubuntu is ready!" -ForegroundColor Green
Write-Host ""

# Download and run the Clawdbot installer in WSL
Write-Host "Step 3: Installing Clawdbot..." -ForegroundColor Yellow
Write-Host ""

$installScript = @'
#!/bin/bash
set -e

# Update packages
sudo apt-get update

# Install curl if needed
sudo apt-get install -y curl

# Download and run Clawdbot installer
curl -fsSL https://raw.githubusercontent.com/clawdbot/clawdbot/main/install.sh | bash

# Or if that doesn't exist, install manually:
if ! command -v clawdbot &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g clawdbot
fi

echo ""
echo "Clawdbot installed! Version: $(clawdbot --version)"
echo ""
echo "Next steps:"
echo "  1. Open Ubuntu from Start menu"
echo "  2. Run: clawdbot configure"
echo "  3. Enter your Anthropic API key"
echo "  4. Run: clawdbot gateway start"
'@

# Save script and run in WSL
$scriptPath = "$env:TEMP\install-clawdbot.sh"
$installScript | Out-File -FilePath $scriptPath -Encoding utf8 -Force

# Convert line endings
(Get-Content $scriptPath) | Set-Content $scriptPath

wsl -d Ubuntu -- bash -c "cat /mnt/c/Users/$env:USERNAME/AppData/Local/Temp/install-clawdbot.sh | tr -d '\r' | bash"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Installation Complete!              " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To use Clawdbot:" -ForegroundColor Yellow
Write-Host "  1. Open 'Ubuntu' from the Start menu" -ForegroundColor White
Write-Host "  2. Run: clawdbot configure" -ForegroundColor White
Write-Host "  3. Run: clawdbot gateway start" -ForegroundColor White
Write-Host ""
Write-Host "Get your API key at: https://console.anthropic.com" -ForegroundColor Cyan
Write-Host ""
pause

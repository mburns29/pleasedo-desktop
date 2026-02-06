# PleaseDo Desktop VM Build

Build a fully isolated VirtualBox VM with Clawdbot pre-installed.

## Security Model

- **Complete isolation** - VM cannot access host files
- User's data stays on their machine
- Clawdbot operates only within the VM
- Network access for web search/APIs only

## Requirements (Build Machine)

- VirtualBox 7.0+
- Packer 1.9+
- ~10GB free disk space
- Internet connection

## Build

```bash
cd vm-build
packer init .
packer build pleasedo.pkr.hcl
```

Output: `output-pleasedo/pleasedo-desktop.ova`

## What's Included

- Debian 12 (minimal)
- Node.js 22
- Clawdbot (latest)
- First-boot setup wizard
- Auto-start on login

## User Experience

1. Download `pleasedo-desktop.ova` (~2GB)
2. Double-click to import into VirtualBox
3. Start VM
4. Follow setup wizard (enter API key)
5. Done - Clawdbot running in isolated environment

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VM_NAME = 'PleaseDo-Desktop';
const CLAWDBOT_PORT = 18789;

class VMManager {
  constructor() {
    this.vboxManage = this.findVBoxManage();
    this.vmPath = this.getVMPath();
  }

  findVBoxManage() {
    if (process.platform === 'win32') {
      const paths = [
        'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
        'C:\\Program Files (x86)\\Oracle\\VirtualBox\\VBoxManage.exe'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return `"${p}"`;
      }
      return 'VBoxManage';
    } else if (process.platform === 'darwin') {
      return '/usr/local/bin/VBoxManage';
    }
    return 'VBoxManage';
  }

  getVMPath() {
    // In production, OVA is in resources folder
    const resourcePath = process.resourcesPath || path.join(__dirname, '..');
    return path.join(resourcePath, 'vm', 'pleasedo-desktop.ova');
  }

  async run(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async checkVirtualBox() {
    try {
      await this.run(`${this.vboxManage} --version`);
      return true;
    } catch {
      return false;
    }
  }

  async isVMImported() {
    try {
      const vms = await this.run(`${this.vboxManage} list vms`);
      return vms.includes(VM_NAME);
    } catch {
      return false;
    }
  }

  async importVM(onProgress) {
    if (await this.isVMImported()) {
      return; // Already imported
    }

    if (!fs.existsSync(this.vmPath)) {
      throw new Error('VM image not found. Please reinstall PleaseDo Desktop.');
    }

    // Import the OVA
    await this.run(`${this.vboxManage} import "${this.vmPath}" --vsys 0 --vmname "${VM_NAME}"`);
    
    // Configure port forwarding for Clawdbot
    await this.run(`${this.vboxManage} modifyvm "${VM_NAME}" --natpf1 "clawdbot,tcp,,${CLAWDBOT_PORT},,${CLAWDBOT_PORT}"`);
    
    // Configure VM to run headless
    await this.run(`${this.vboxManage} modifyvm "${VM_NAME}" --graphicscontroller vmsvga`);
  }

  async startVM() {
    if (await this.isVMRunning()) {
      return; // Already running
    }

    // Start headless (no window)
    await this.run(`${this.vboxManage} startvm "${VM_NAME}" --type headless`);
    
    // Wait for boot
    await this.sleep(5000);
    
    // Apply any pending configuration
    await this.applyPendingConfig();
  }

  async stopVM() {
    if (!(await this.isVMRunning())) {
      return;
    }

    try {
      // Try graceful shutdown first
      await this.run(`${this.vboxManage} controlvm "${VM_NAME}" acpipowerbutton`);
      
      // Wait for shutdown
      for (let i = 0; i < 30; i++) {
        await this.sleep(1000);
        if (!(await this.isVMRunning())) {
          return;
        }
      }
      
      // Force poweroff if still running
      await this.run(`${this.vboxManage} controlvm "${VM_NAME}" poweroff`);
    } catch (error) {
      console.error('Error stopping VM:', error);
    }
  }

  async isVMRunning() {
    try {
      const running = await this.run(`${this.vboxManage} list runningvms`);
      return running.includes(VM_NAME);
    } catch {
      return false;
    }
  }

  async waitForClawdbot(timeoutMs = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isClawdbotReady()) {
        return true;
      }
      await this.sleep(2000);
    }
    
    throw new Error('Clawdbot did not start in time');
  }

  async isClawdbotReady() {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${CLAWDBOT_PORT}/health`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  async configureClawdbot(config) {
    // Store config to be written when VM starts
    this.pendingConfig = config;
    console.log('Config stored, will be applied when VM starts');
  }

  async saveSoulFile(content) {
    // Store SOUL.md content to be written when VM starts
    this.pendingSoul = content;
    console.log('SOUL.md stored, will be applied when VM starts');
  }

  async applyPendingConfig() {
    // Apply stored config and SOUL.md to running VM
    if (!await this.isVMRunning()) {
      return;
    }

    // Write files via SSH (guest must have SSH enabled)
    // For now, we'll write to a shared folder that the VM mounts
    const configDir = path.join(os.homedir(), '.pleasedo-vm-config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }

    if (this.pendingConfig) {
      const configJson = JSON.stringify({
        anthropic: { apiKey: this.pendingConfig.apiKey },
        telegram: this.pendingConfig.telegramToken ? { botToken: this.pendingConfig.telegramToken } : undefined
      }, null, 2);
      const configPath = path.join(configDir, 'clawdbot-config.json');
      fs.writeFileSync(configPath, configJson, { mode: 0o600 });
    }

    if (this.pendingSoul) {
      const soulPath = path.join(configDir, 'SOUL.md');
      fs.writeFileSync(soulPath, this.pendingSoul, { mode: 0o600 });
    }

    // Lock down the directory (Security Fix #4)
    try {
      fs.chmodSync(configDir, 0o700);
    } catch (e) {
      // Windows doesn't support chmod the same way
      console.log('Note: chmod not fully supported on this platform');
    }
  }

  async sendToClawdbot(message) {
    const http = require('http');
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ message });
      const req = http.request({
        hostname: 'localhost',
        port: CLAWDBOT_PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ response: body });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  getClawdbotPort() {
    return CLAWDBOT_PORT;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { VMManager };

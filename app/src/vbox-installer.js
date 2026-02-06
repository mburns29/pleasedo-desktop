const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// VirtualBox download URLs (update version as needed)
const VBOX_VERSION = '7.0.14';
const VBOX_BUILD = '161095';

const DOWNLOAD_URLS = {
  win32: `https://download.virtualbox.org/virtualbox/${VBOX_VERSION}/VirtualBox-${VBOX_VERSION}-${VBOX_BUILD}-Win.exe`,
  darwin: `https://download.virtualbox.org/virtualbox/${VBOX_VERSION}/VirtualBox-${VBOX_VERSION}-${VBOX_BUILD}-OSX.dmg`
};

class VBoxInstaller {
  constructor() {
    this.platform = process.platform;
    this.downloadDir = path.join(os.tmpdir(), 'pleasedo-vbox');
  }

  /**
   * Check if VirtualBox is installed
   */
  async isInstalled() {
    return new Promise((resolve) => {
      const cmd = this.platform === 'win32' 
        ? 'where VBoxManage 2>nul || dir /b "C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe" 2>nul'
        : 'which VBoxManage';
      
      exec(cmd, (error, stdout) => {
        resolve(!error && stdout.trim().length > 0);
      });
    });
  }

  /**
   * Download VirtualBox installer with progress callback
   */
  async download(onProgress) {
    const url = DOWNLOAD_URLS[this.platform];
    if (!url) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }

    // Create download directory
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }

    const filename = this.platform === 'win32' 
      ? `VirtualBox-${VBOX_VERSION}-Win.exe`
      : `VirtualBox-${VBOX_VERSION}-OSX.dmg`;
    
    const filePath = path.join(this.downloadDir, filename);

    // Skip download if already exists (resume support)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      // If file seems complete (> 50MB), skip download
      if (stats.size > 50 * 1024 * 1024) {
        onProgress && onProgress(100, 'Download complete (cached)');
        return filePath;
      }
    }

    return new Promise((resolve, reject) => {
      onProgress && onProgress(0, 'Starting download...');

      const download = (downloadUrl) => {
        const protocol = downloadUrl.startsWith('https') ? https : http;
        
        protocol.get(downloadUrl, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            download(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'], 10);
          let downloadedSize = 0;

          const file = fs.createWriteStream(filePath);
          
          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const percent = Math.round((downloadedSize / totalSize) * 100);
            const mb = (downloadedSize / 1024 / 1024).toFixed(1);
            const totalMb = (totalSize / 1024 / 1024).toFixed(1);
            onProgress && onProgress(percent, `Downloading: ${mb}MB / ${totalMb}MB`);
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            onProgress && onProgress(100, 'Download complete');
            resolve(filePath);
          });

          file.on('error', (err) => {
            fs.unlink(filePath, () => {}); // Delete partial file
            reject(err);
          });
        }).on('error', reject);
      };

      download(url);
    });
  }

  /**
   * Install VirtualBox (requires admin/sudo)
   */
  async install(installerPath, onProgress) {
    onProgress && onProgress(0, 'Installing VirtualBox...');

    if (this.platform === 'win32') {
      return this.installWindows(installerPath, onProgress);
    } else if (this.platform === 'darwin') {
      return this.installMac(installerPath, onProgress);
    } else {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  async installWindows(installerPath, onProgress) {
    return new Promise((resolve, reject) => {
      // Silent install with no reboot
      // User will see UAC prompt
      const cmd = `"${installerPath}" --silent --ignore-reboot`;
      
      onProgress && onProgress(30, 'Installing (please accept admin prompt)...');
      
      exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          // Exit code 3010 means success but reboot required - we ignore reboot
          if (error.code === 3010) {
            onProgress && onProgress(100, 'Installation complete');
            resolve(true);
          } else {
            reject(new Error(`Installation failed: ${stderr || error.message}`));
          }
        } else {
          onProgress && onProgress(100, 'Installation complete');
          resolve(true);
        }
      });
    });
  }

  async installMac(installerPath, onProgress) {
    return new Promise((resolve, reject) => {
      onProgress && onProgress(20, 'Mounting disk image...');
      
      // Mount the DMG
      exec(`hdiutil attach "${installerPath}" -nobrowse`, { timeout: 60000 }, (error, stdout) => {
        if (error) {
          reject(new Error(`Failed to mount DMG: ${error.message}`));
          return;
        }

        // Find the mounted volume
        const volumeMatch = stdout.match(/\/Volumes\/VirtualBox[^\n]*/);
        if (!volumeMatch) {
          reject(new Error('Could not find mounted VirtualBox volume'));
          return;
        }

        const volumePath = volumeMatch[0].trim();
        const pkgPath = path.join(volumePath, 'VirtualBox.pkg');

        onProgress && onProgress(50, 'Installing (please enter password if prompted)...');

        // Install the package - this will prompt for admin password via GUI
        exec(`osascript -e 'do shell script "installer -pkg \\"${pkgPath}\\" -target /" with administrator privileges'`, 
          { timeout: 300000 }, (installError) => {
            // Unmount regardless of install result
            exec(`hdiutil detach "${volumePath}"`, () => {});

            if (installError) {
              reject(new Error(`Installation failed: ${installError.message}`));
            } else {
              onProgress && onProgress(100, 'Installation complete');
              resolve(true);
            }
          }
        );
      });
    });
  }

  /**
   * Full install flow: download + install
   */
  async downloadAndInstall(onProgress) {
    // Check if already installed
    if (await this.isInstalled()) {
      onProgress && onProgress(100, 'VirtualBox already installed');
      return true;
    }

    // Download
    const installerPath = await this.download((percent, message) => {
      // Download is 0-60% of total progress
      onProgress && onProgress(Math.round(percent * 0.6), message);
    });

    // Install
    await this.install(installerPath, (percent, message) => {
      // Install is 60-100% of total progress
      onProgress && onProgress(60 + Math.round(percent * 0.4), message);
    });

    // Verify installation
    const success = await this.isInstalled();
    if (!success) {
      throw new Error('VirtualBox installation could not be verified. Please try installing manually.');
    }

    // Cleanup installer
    try {
      fs.unlinkSync(installerPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    return true;
  }
}

module.exports = { VBoxInstaller };

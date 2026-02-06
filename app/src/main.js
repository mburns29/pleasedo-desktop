const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { VMManager } = require('./vm-manager');
const { VBoxInstaller } = require('./vbox-installer');
const Store = require('./store');

let mainWindow;
let vmManager;
let store;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Remove menu bar on Windows/Linux
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  store = new Store();
  vmManager = new VMManager();
  
  createWindow();
  
  // Check VirtualBox installation
  const vboxInstalled = await vmManager.checkVirtualBox();
  mainWindow.webContents.on('did-finish-load', async () => {
    mainWindow.webContents.send('init', {
      vboxInstalled,
      configured: store.get('apiKey') ? true : false,
      personalized: store.get('personalized') ? true : false,
      vmImported: await vmManager.isVMImported()
    });
  });
});

app.on('window-all-closed', async () => {
  // Stop VM when app closes
  if (vmManager) {
    await vmManager.stopVM();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('check-virtualbox', async () => {
  return await vmManager.checkVirtualBox();
});

ipcMain.handle('install-virtualbox', async () => {
  try {
    const installer = new VBoxInstaller();
    
    // Check if already installed
    if (await installer.isInstalled()) {
      return { success: true, message: 'VirtualBox is already installed!' };
    }
    
    // Download and install with progress updates
    await installer.downloadAndInstall((percent, message) => {
      mainWindow.webContents.send('vbox-install-progress', { percent, message });
    });
    
    // Update vmManager's vboxManage path after installation
    vmManager = new VMManager();
    
    return { success: true, message: 'VirtualBox installed successfully!' };
  } catch (error) {
    console.error('VirtualBox installation error:', error);
    
    // Fallback: open download page manually
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Auto-install failed',
      message: `Automatic installation failed: ${error.message}\n\nWould you like to download VirtualBox manually?`,
      buttons: ['Download Manually', 'Cancel'],
      defaultId: 0
    });
    
    if (response.response === 0) {
      require('electron').shell.openExternal('https://www.virtualbox.org/wiki/Downloads');
    }
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-vm', async (event) => {
  try {
    mainWindow.webContents.send('status', { message: 'Importing VM (this takes 1-2 minutes)...', progress: 10 });
    await vmManager.importVM((progress) => {
      mainWindow.webContents.send('status', { message: 'Importing VM...', progress });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', async (event, config) => {
  store.set('apiKey', config.apiKey);
  if (config.telegramToken) {
    store.set('telegramToken', config.telegramToken);
  }
  
  // Write config to VM
  try {
    await vmManager.configureClawdbot(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-soul', async (event, content) => {
  store.set('soulContent', content);
  store.set('personalized', true);
  
  // Write SOUL.md to VM when it starts
  try {
    await vmManager.saveSoulFile(content);
    return { success: true };
  } catch (error) {
    // Not critical - VM might not be running yet
    console.log('SOUL.md will be written when VM starts');
    return { success: true };
  }
});

ipcMain.handle('start-vm', async () => {
  try {
    mainWindow.webContents.send('status', { message: 'Starting PleaseDo...', progress: 30 });
    await vmManager.startVM();
    mainWindow.webContents.send('status', { message: 'Waiting for Clawdbot...', progress: 70 });
    await vmManager.waitForClawdbot();
    mainWindow.webContents.send('status', { message: 'Ready!', progress: 100 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-vm', async () => {
  try {
    await vmManager.stopVM();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-status', async () => {
  return {
    vmRunning: await vmManager.isVMRunning(),
    clawdbotReady: await vmManager.isClawdbotReady()
  };
});

ipcMain.handle('open-chat', async () => {
  // Open Clawdbot web UI in default browser
  const port = await vmManager.getClawdbotPort();
  require('electron').shell.openExternal(`http://localhost:${port}`);
});

ipcMain.handle('send-message', async (event, message) => {
  try {
    const response = await vmManager.sendToClawdbot(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Integration OAuth URLs
const OAUTH_URLS = {
  stripe: 'https://connect.stripe.com/oauth/authorize',
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  github: 'https://github.com/login/oauth/authorize',
  notion: 'https://api.notion.com/v1/oauth/authorize',
  slack: 'https://slack.com/oauth/v2/authorize',
  discord: 'https://discord.com/api/oauth2/authorize',
  twitter: 'https://twitter.com/i/oauth2/authorize',
  linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
  dropbox: 'https://www.dropbox.com/oauth2/authorize',
  todoist: 'https://todoist.com/oauth/authorize',
  trello: 'https://trello.com/1/authorize',
  vercel: 'https://vercel.com/integrations/pleasedo/new',
  digitalocean: 'https://cloud.digitalocean.com/v1/oauth/authorize',
  airtable: 'https://airtable.com/oauth2/v1/authorize',
  linear: 'https://linear.app/oauth/authorize',
  quickbooks: 'https://appcenter.intuit.com/connect/oauth2',
  youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
  railway: 'https://railway.app/oauth/authorize'
};

// Integration guide URLs
const GUIDE_URLS = {
  telegram: 'https://docs.pleasedo.ai/integrations/telegram',
  resend: 'https://docs.pleasedo.ai/integrations/resend',
  twilio: 'https://docs.pleasedo.ai/integrations/twilio',
  cloudflare: 'https://docs.pleasedo.ai/integrations/cloudflare',
  openai: 'https://docs.pleasedo.ai/integrations/openai',
  elevenlabs: 'https://docs.pleasedo.ai/integrations/elevenlabs',
  browserless: 'https://docs.pleasedo.ai/integrations/browserless',
  brave: 'https://docs.pleasedo.ai/integrations/brave-search',
  aws: 'https://docs.pleasedo.ai/integrations/aws'
};

ipcMain.handle('start-oauth', async (event, service) => {
  const baseUrl = OAUTH_URLS[service];
  if (!baseUrl) {
    return { success: false, error: 'Unknown service' };
  }
  
  // For now, just open the OAuth page
  // Full implementation would include:
  // 1. Start local callback server
  // 2. Build OAuth URL with client_id, redirect_uri, scopes
  // 3. Handle callback and token exchange
  // 4. Store tokens securely
  
  require('electron').shell.openExternal(baseUrl);
  
  // Return pending - full OAuth flow would wait for callback
  return { success: false, error: 'OAuth flow not fully implemented yet. Please check documentation.' };
});

ipcMain.handle('open-integration-guide', async (event, service) => {
  const guideUrl = GUIDE_URLS[service] || `https://docs.pleasedo.ai/integrations/${service}`;
  require('electron').shell.openExternal(guideUrl);
  return { success: true };
});

ipcMain.handle('get-integrations', async () => {
  // Return list of connected integrations
  const connected = store.get('integrations') || {};
  return connected;
});

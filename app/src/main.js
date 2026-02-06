const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { VMManager } = require('./vm-manager');
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
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('init', {
      vboxInstalled,
      configured: store.get('apiKey') ? true : false,
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
  // Open VirtualBox download page
  require('electron').shell.openExternal('https://www.virtualbox.org/wiki/Downloads');
  return { success: true, message: 'Opening VirtualBox download page...' };
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

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pleasedo', {
  // Setup
  checkVirtualBox: () => ipcRenderer.invoke('check-virtualbox'),
  installVirtualBox: () => ipcRenderer.invoke('install-virtualbox'),
  importVM: () => ipcRenderer.invoke('import-vm'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // VM Control
  startVM: () => ipcRenderer.invoke('start-vm'),
  stopVM: () => ipcRenderer.invoke('stop-vm'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Chat
  openChat: () => ipcRenderer.invoke('open-chat'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Events
  onInit: (callback) => ipcRenderer.on('init', (event, data) => callback(data)),
  onStatus: (callback) => ipcRenderer.on('status', (event, data) => callback(data))
});

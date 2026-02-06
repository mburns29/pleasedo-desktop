const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pleasedo', {
  // Setup
  checkVirtualBox: () => ipcRenderer.invoke('check-virtualbox'),
  installVirtualBox: () => ipcRenderer.invoke('install-virtualbox'),
  importVM: () => ipcRenderer.invoke('import-vm'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  saveSoul: (content) => ipcRenderer.invoke('save-soul', content),
  
  // VM Control
  startVM: () => ipcRenderer.invoke('start-vm'),
  stopVM: () => ipcRenderer.invoke('stop-vm'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Chat
  openChat: () => ipcRenderer.invoke('open-chat'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Integrations
  startOAuth: (service) => ipcRenderer.invoke('start-oauth', service),
  openIntegrationGuide: (service) => ipcRenderer.invoke('open-integration-guide', service),
  getIntegrations: () => ipcRenderer.invoke('get-integrations'),
  
  // Events
  onInit: (callback) => ipcRenderer.on('init', (event, data) => callback(data)),
  onStatus: (callback) => ipcRenderer.on('status', (event, data) => callback(data)),
  onVBoxInstallProgress: (callback) => ipcRenderer.on('vbox-install-progress', (event, data) => callback(data))
});

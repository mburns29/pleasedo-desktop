// UI State
let state = {
  vboxInstalled: false,
  vmImported: false,
  configured: false,
  running: false
};

// Elements
const screens = {
  setup: document.getElementById('screen-setup'),
  vbox: document.getElementById('screen-vbox'),
  config: document.getElementById('screen-config'),
  main: document.getElementById('screen-main')
};

const steps = {
  vbox: document.getElementById('step-vbox'),
  vm: document.getElementById('step-vm'),
  config: document.getElementById('step-config')
};

// Show a specific screen
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// Update step status
function setStepStatus(step, status) {
  const icon = steps[step].querySelector('.step-icon');
  icon.className = 'step-icon ' + status;
  if (status === 'done') icon.textContent = '✓';
  else if (status === 'error') icon.textContent = '✗';
  else if (status === 'loading') icon.textContent = '⋯';
}

// Update status bar
function setStatus(running, text) {
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  dot.className = 'status-dot ' + (running ? 'on' : 'off');
  statusText.textContent = text || (running ? 'Running' : 'Not running');
}

// Initialize
window.pleasedo.onInit(async (data) => {
  state = { ...state, ...data };
  await checkSetup();
});

// Status updates
window.pleasedo.onStatus((data) => {
  if (data.message) {
    document.getElementById('main-status').textContent = data.message;
  }
  if (data.progress !== undefined) {
    const bar = document.getElementById('main-progress');
    bar.style.width = data.progress + '%';
  }
});

// Check setup status
async function checkSetup() {
  state.vboxInstalled = await window.pleasedo.checkVirtualBox();
  
  if (!state.vboxInstalled) {
    setStepStatus('vbox', 'error');
    setStepStatus('vm', 'pending');
    setStepStatus('config', 'pending');
    document.getElementById('setup-progress').style.width = '0%';
    document.getElementById('btn-setup').textContent = 'Install VirtualBox';
    showScreen('setup');
    return;
  }
  
  setStepStatus('vbox', 'done');
  document.getElementById('setup-progress').style.width = '33%';
  
  // Check if VM is imported
  const status = await window.pleasedo.getStatus();
  if (!state.vmImported) {
    setStepStatus('vm', 'pending');
    setStepStatus('config', 'pending');
    document.getElementById('btn-setup').textContent = 'Import VM';
    showScreen('setup');
    return;
  }
  
  setStepStatus('vm', 'done');
  document.getElementById('setup-progress').style.width = '66%';
  
  if (!state.configured) {
    setStepStatus('config', 'pending');
    document.getElementById('btn-setup').textContent = 'Configure';
    showScreen('setup');
    return;
  }
  
  setStepStatus('config', 'done');
  document.getElementById('setup-progress').style.width = '100%';
  
  // All done - show main screen
  showScreen('main');
  
  // Check if already running
  if (status.vmRunning) {
    state.running = true;
    document.getElementById('btn-power').textContent = '⏹';
    document.getElementById('main-status').textContent = 'Running';
    document.getElementById('btn-chat').style.display = 'block';
    setStatus(true);
  }
}

// Setup button
document.getElementById('btn-setup').addEventListener('click', async () => {
  const btn = document.getElementById('btn-setup');
  const error = document.getElementById('setup-error');
  error.style.display = 'none';
  
  if (!state.vboxInstalled) {
    showScreen('vbox');
    return;
  }
  
  if (!state.vmImported) {
    btn.disabled = true;
    btn.textContent = 'Importing...';
    setStepStatus('vm', 'loading');
    
    try {
      const result = await window.pleasedo.importVM();
      if (result.success) {
        state.vmImported = true;
        await checkSetup();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setStepStatus('vm', 'error');
      error.textContent = err.message;
      error.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Retry';
    }
    return;
  }
  
  if (!state.configured) {
    showScreen('config');
    return;
  }
});

// VirtualBox download
document.getElementById('btn-download-vbox').addEventListener('click', async () => {
  await window.pleasedo.installVirtualBox();
});

// Anthropic link
document.getElementById('link-anthropic').addEventListener('click', () => {
  require('electron').shell.openExternal('https://console.anthropic.com');
});

// Save config
document.getElementById('btn-save-config').addEventListener('click', async () => {
  const apiKey = document.getElementById('input-apikey').value.trim();
  const telegramToken = document.getElementById('input-telegram').value.trim();
  const btn = document.getElementById('btn-save-config');
  const error = document.getElementById('config-error');
  
  if (!apiKey) {
    error.textContent = 'API key is required';
    error.style.display = 'block';
    return;
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    error.textContent = 'Invalid API key format';
    error.style.display = 'block';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  error.style.display = 'none';
  
  try {
    const result = await window.pleasedo.saveConfig({ apiKey, telegramToken });
    if (result.success) {
      state.configured = true;
      await checkSetup();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save & Continue';
  }
});

// Power button
document.getElementById('btn-power').addEventListener('click', async () => {
  const btn = document.getElementById('btn-power');
  const status = document.getElementById('main-status');
  const progressBar = document.getElementById('main-progress-bar');
  const chatBtn = document.getElementById('btn-chat');
  
  if (state.running) {
    // Stop
    btn.disabled = true;
    btn.textContent = '⋯';
    status.textContent = 'Stopping...';
    setStatus(false, 'Stopping...');
    
    await window.pleasedo.stopVM();
    
    state.running = false;
    btn.disabled = false;
    btn.textContent = '▶';
    status.textContent = 'Click to start';
    chatBtn.style.display = 'none';
    progressBar.style.display = 'none';
    setStatus(false);
  } else {
    // Start
    btn.disabled = true;
    btn.textContent = '⋯';
    progressBar.style.display = 'block';
    document.getElementById('main-progress').style.width = '0%';
    setStatus(false, 'Starting...');
    
    try {
      const result = await window.pleasedo.startVM();
      if (result.success) {
        state.running = true;
        btn.textContent = '⏹';
        status.textContent = 'Running';
        chatBtn.style.display = 'block';
        setStatus(true);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      btn.textContent = '▶';
      setStatus(false, 'Error');
    }
    
    btn.disabled = false;
    progressBar.style.display = 'none';
  }
});

// Chat button
document.getElementById('btn-chat').addEventListener('click', async () => {
  await window.pleasedo.openChat();
});

// Settings
document.getElementById('btn-settings').addEventListener('click', () => {
  showScreen('config');
});

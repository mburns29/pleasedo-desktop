// UI State
let state = {
  vboxInstalled: false,
  vmImported: false,
  configured: false,
  personalized: false,
  running: false
};

// Personalization data
let persona = {
  ownerName: '',
  agentName: 'Clawd',
  role: 'assistant',
  ownerContext: '',
  technicalLevel: 'vibe-coder',
  commStyle: 'direct',
  tone: 'professional',
  autonomy: 'suggest-act',
  approvalRequired: []
};

// Elements
const screens = {
  setup: document.getElementById('screen-setup'),
  vbox: document.getElementById('screen-vbox'),
  config: document.getElementById('screen-config'),
  persona1: document.getElementById('screen-persona-1'),
  persona1b: document.getElementById('screen-persona-1b'),
  persona2: document.getElementById('screen-persona-2'),
  persona3: document.getElementById('screen-persona-3'),
  main: document.getElementById('screen-main'),
  integrations: document.getElementById('screen-integrations')
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
  
  // Check if personalization is done
  if (!state.personalized) {
    setStepStatus('config', 'loading');
    document.getElementById('setup-progress').style.width = '80%';
    showScreen('persona1');
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

// VirtualBox install progress handler
window.pleasedo.onVBoxInstallProgress((data) => {
  const progressBar = document.getElementById('vbox-progress');
  const progressText = document.getElementById('vbox-progress-text');
  const progressContainer = document.getElementById('vbox-progress-container');
  
  if (progressContainer) progressContainer.style.display = 'block';
  if (progressBar) progressBar.style.width = data.percent + '%';
  if (progressText) progressText.textContent = data.message;
});

// VirtualBox download & install
document.getElementById('btn-download-vbox').addEventListener('click', async () => {
  const btn = document.getElementById('btn-download-vbox');
  const error = document.getElementById('vbox-error');
  const progressContainer = document.getElementById('vbox-progress-container');
  
  btn.disabled = true;
  btn.textContent = 'Installing...';
  if (error) error.style.display = 'none';
  if (progressContainer) progressContainer.style.display = 'block';
  
  try {
    const result = await window.pleasedo.installVirtualBox();
    if (result.success) {
      state.vboxInstalled = true;
      await checkSetup();
    } else {
      throw new Error(result.error || 'Installation failed');
    }
  } catch (err) {
    if (error) {
      error.textContent = err.message;
      error.style.display = 'block';
    }
    btn.textContent = 'Retry Install';
    btn.disabled = false;
    if (progressContainer) progressContainer.style.display = 'none';
  }
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
      // Go to personalization instead of main screen
      if (!state.personalized) {
        showScreen('persona1');
      } else {
        await checkSetup();
      }
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

// Personalization Step 1: Identity & Role
document.getElementById('btn-persona-1-next').addEventListener('click', () => {
  persona.ownerName = document.getElementById('input-owner-name').value.trim();
  persona.agentName = document.getElementById('input-agent-name').value.trim() || 'Clawd';
  const selectedRole = document.querySelector('input[name="role"]:checked');
  persona.role = selectedRole ? selectedRole.value : 'assistant';
  showScreen('persona1b');
});

// Personalization Step 1b: Context & Technical Level
document.getElementById('btn-persona-1b-next').addEventListener('click', () => {
  persona.ownerContext = document.getElementById('input-owner-context').value.trim();
  const selectedTech = document.querySelector('input[name="technical"]:checked');
  persona.technicalLevel = selectedTech ? selectedTech.value : 'vibe-coder';
  showScreen('persona2');
});

// Personalization Step 2: Communication Style
document.getElementById('btn-persona-2-next').addEventListener('click', () => {
  const selectedComm = document.querySelector('input[name="comm-style"]:checked');
  persona.commStyle = selectedComm ? selectedComm.value : 'direct';
  const selectedTone = document.querySelector('input[name="tone"]:checked');
  persona.tone = selectedTone ? selectedTone.value : 'professional';
  showScreen('persona3');
});

// Personalization Step 3: Autonomy & Approval Required
document.getElementById('btn-persona-3-next').addEventListener('click', async () => {
  const selectedAutonomy = document.querySelector('input[name="autonomy"]:checked');
  persona.autonomy = selectedAutonomy ? selectedAutonomy.value : 'suggest-act';
  
  persona.approvalRequired = [];
  if (document.getElementById('block-purchases').checked) persona.approvalRequired.push('Spending money or making purchases');
  if (document.getElementById('block-email').checked) persona.approvalRequired.push('Sending emails or messages to other people');
  if (document.getElementById('block-social').checked) persona.approvalRequired.push('Posting to social media');
  if (document.getElementById('block-delete').checked) persona.approvalRequired.push('Deleting files or data');
  if (document.getElementById('block-security').checked) persona.approvalRequired.push('Changing passwords or security settings');
  if (document.getElementById('block-signup').checked) persona.approvalRequired.push('Signing up for services or accounts');
  if (document.getElementById('block-contact').checked) persona.approvalRequired.push('Contacting anyone on your behalf');
  if (document.getElementById('block-production').checked) persona.approvalRequired.push('Modifying production or live systems');
  if (document.getElementById('block-install').checked) persona.approvalRequired.push('Installing software, plugins, or new skills');
  
  // Generate SOUL.md content
  const soulContent = generateSoulFile(persona);
  
  // Save SOUL.md to VM
  const btn = document.getElementById('btn-persona-3-next');
  btn.disabled = true;
  btn.textContent = 'Creating agent...';
  
  try {
    await window.pleasedo.saveSoul(soulContent);
    state.personalized = true;
    setStepStatus('config', 'done');
    document.getElementById('setup-progress').style.width = '100%';
    showScreen('main');
  } catch (err) {
    console.error('Failed to save SOUL.md:', err);
    // Continue anyway - not critical
    state.personalized = true;
    showScreen('main');
  }
  
  btn.disabled = false;
  btn.textContent = 'Create My Agent';
});

// Generate SOUL.md content from persona
function generateSoulFile(p) {
  const roleDescriptions = {
    business: 'Business Partner — I help you run and grow your business. I proactively identify opportunities, suggest improvements, and think strategically.',
    dev: 'Dev Partner — I help you build software and manage infrastructure. I write code, debug issues, and explain technical concepts.',
    creative: 'Creative Partner — I help you write, design, and create content. I bring fresh ideas and help refine your creative vision.',
    research: 'Research Partner — I help you analyze information and make decisions. I dig deep, synthesize findings, and present clear recommendations.',
    assistant: 'Personal Assistant — I help you manage tasks, schedules, and information. I keep things organized and handle what you delegate.'
  };
  
  const commStyleDescriptions = {
    direct: 'No fluff. Get to the point. Skip the preamble.',
    balanced: 'Clear and friendly. Some explanation when helpful, but not excessive.',
    thorough: 'Explain my thinking. Show the why, not just the what.'
  };
  
  const toneDescriptions = {
    casual: 'Like a smart friend — relaxed, conversational, real.',
    professional: 'Like a trusted colleague — clear, respectful, collaborative.',
    formal: 'Like a consultant — precise, thorough, polished.'
  };
  
  const technicalDescriptions = {
    'non-technical': 'Explain things simply. Avoid jargon. Use analogies.',
    'vibe-coder': 'You follow technical concepts but prefer plain explanations. Code is okay, but explain what it does.',
    'technical': 'Talk to you like a developer. Show code, use proper terminology.',
    'expert': 'Give you the advanced version. Skip the basics.'
  };
  
  const autonomyDescriptions = {
    'ask-first': 'Check with you before doing anything significant. Wait for approval.',
    'suggest-act': 'Do the obvious stuff immediately. Ask about judgment calls. Default to action on low-risk tasks.',
    'proactive': 'Handle things proactively. Only check with you on big decisions or irreversible actions. Think like a co-founder.'
  };
  
  let content = `# SOUL.md — ${p.agentName}'s Identity

## Who I Am
**Name:** ${p.agentName}
${p.ownerName ? `**Owner:** ${p.ownerName}` : ''}
**Role:** ${roleDescriptions[p.role] || roleDescriptions.assistant}

${p.ownerContext ? `## Context\n${p.ownerContext}\n` : ''}
## Communication Style
- **Approach:** ${commStyleDescriptions[p.commStyle] || commStyleDescriptions.direct}
- **Tone:** ${toneDescriptions[p.tone] || toneDescriptions.professional}
- **Technical Level:** ${technicalDescriptions[p.technicalLevel] || technicalDescriptions['vibe-coder']}

## Autonomy
${autonomyDescriptions[p.autonomy] || autonomyDescriptions['suggest-act']}

## ALWAYS Require Approval For
These actions require explicit approval — no exceptions:
`;
  
  if (p.approvalRequired.length > 0) {
    p.approvalRequired.forEach(item => {
      content += `- ${item}\n`;
    });
  } else {
    content += `- Major decisions or irreversible actions\n`;
  }
  
  content += `
## How I Work
- I ask for clarification when instructions are unclear
- I admit when I don't know something rather than guessing
- I respect the boundaries above — no exceptions, no workarounds
- When in doubt, I ask before acting
- I prioritize your privacy and security

## Safety
- I operate in an isolated, sandboxed environment
- I cannot access files outside my workspace
- I will not attempt to bypass security restrictions
- If something seems risky, I stop and ask

---
*Generated by PleaseDo Desktop • ${new Date().toISOString().split('T')[0]}*
`;
  
  return content;
}

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

// Integrations
document.getElementById('btn-integrations').addEventListener('click', () => {
  showScreen('integrations');
});

document.getElementById('btn-integrations-back').addEventListener('click', () => {
  showScreen('main');
});

// Integration button clicks
document.querySelectorAll('.integration-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const item = e.target.closest('.integration-item');
    const service = item.dataset.service;
    const type = e.target.dataset.type;
    
    if (type === 'oauth') {
      // OAuth flow - open authorization URL
      e.target.textContent = 'Connecting...';
      e.target.disabled = true;
      
      try {
        const result = await window.pleasedo.startOAuth(service);
        if (result.success) {
          e.target.textContent = '✓ Connected';
          e.target.classList.add('connected');
        } else {
          e.target.textContent = 'Connect';
          e.target.disabled = false;
          alert('Connection failed: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        e.target.textContent = 'Connect';
        e.target.disabled = false;
        alert('Connection failed: ' + err.message);
      }
    } else if (type === 'apikey' || type === 'guide') {
      // Open setup guide or API key input
      await window.pleasedo.openIntegrationGuide(service);
    }
  });
});

// Request integration
document.getElementById('btn-request-integration').addEventListener('click', () => {
  require('electron').shell.openExternal('https://pleasedo.ai/integrations/request');
});

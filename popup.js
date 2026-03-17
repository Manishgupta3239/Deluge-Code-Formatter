// popup.js — multi-provider: Grok, Claude, Gemini

const PROVIDERS = {
    grok: {
        label: 'Grok (xAI) API Key',
        hint:  'Starts with xai- — get it at console.x.ai',
        placeholder: 'xai-...',
        validate: k => k.startsWith('xai-'),
    },
    claude: {
        label: 'Anthropic (Claude) API Key',
        hint:  'Starts with sk-ant- — get it at console.anthropic.com',
        placeholder: 'sk-ant-api03-...',
        validate: k => k.startsWith('sk-ant-'),
    },
    gemini: {
        label: 'Google Gemini API Key',
        hint:  'Get it at aistudio.google.com/app/apikey',
        placeholder: 'AIza...',
        validate: k => k.length > 10,
    },
};

let activeProvider = 'grok'; // default

const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn     = document.getElementById('saveBtn');
const testBtn     = document.getElementById('testBtn');
const clearBtn    = document.getElementById('clearBtn');
const toggleVis   = document.getElementById('toggleVis');
const statusBadge = document.getElementById('statusBadge');
const statusText  = document.getElementById('statusText');
const keyLabel    = document.getElementById('keyLabel');
const keyHint     = document.getElementById('keyHint');
const msgEl       = document.getElementById('msg');
const tabs        = document.querySelectorAll('.provider-tab');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = 'msg ' + type;
    msgEl.style.display = 'block';
    if (type === 'success') setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
}

function setStatus(type, text) {
    statusBadge.className = 'status ' + type;
    statusText.textContent = text;
}

function storageKey(provider) {
    return 'delugeApiKey_' + provider;
}

// ─────────────────────────────────────────
// Switch provider tab
// ─────────────────────────────────────────
function switchProvider(provider) {
    activeProvider = provider;
    const cfg = PROVIDERS[provider];

    // Update tab active state
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.provider === provider);
    });

    // Update input UI
    keyLabel.textContent = cfg.label;
    keyHint.textContent  = cfg.hint;
    apiKeyInput.placeholder = cfg.placeholder;
    apiKeyInput.value = '';
    msgEl.style.display = 'none';

    // Load saved key for this provider
    chrome.storage.sync.get([storageKey(provider)], function (result) {
        const saved = result[storageKey(provider)];
        if (saved) {
            apiKeyInput.value = saved;
            setStatus('connected', provider.charAt(0).toUpperCase() + provider.slice(1) + ' key saved ✓');
        } else {
            setStatus('disconnected', 'No ' + provider + ' key — enter one below');
        }
    });
}

// ─────────────────────────────────────────
// Tab click
// ─────────────────────────────────────────
tabs.forEach(tab => {
    tab.addEventListener('click', () => switchProvider(tab.dataset.provider));
});

// ─────────────────────────────────────────
// Toggle show/hide
// ─────────────────────────────────────────
toggleVis.addEventListener('click', function () {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleVis.textContent = '🙈';
    } else {
        apiKeyInput.type = 'password';
        toggleVis.textContent = '👁';
    }
});

// ─────────────────────────────────────────
// Save key
// ─────────────────────────────────────────
saveBtn.addEventListener('click', function () {
    const key = apiKeyInput.value.trim();
    const cfg = PROVIDERS[activeProvider];

    if (!key) { showMsg('Please enter your API key first.', 'error'); return; }
    if (!cfg.validate(key)) { showMsg('Invalid key format. ' + cfg.hint, 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const data = {};
    data[storageKey(activeProvider)] = key;
    // Also save which provider is active
    data['delugeActiveProvider'] = activeProvider;

    chrome.storage.sync.set(data, function () {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Key';
        setStatus('connected', activeProvider + ' key saved — AI ready ✓');
        showMsg('✓ API key saved successfully!', 'success');
    });
});

// ─────────────────────────────────────────
// Test key — routed through background.js
// ─────────────────────────────────────────
testBtn.addEventListener('click', function () {
    const key = apiKeyInput.value.trim();
    if (!key) { showMsg('Enter your API key first.', 'error'); return; }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    showMsg('Connecting...', 'info');

    chrome.runtime.sendMessage(
        { type: 'TEST_API_KEY', provider: activeProvider, key: key },
        function (response) {
            testBtn.disabled = false;
            testBtn.textContent = '⚡ Test';

            if (response && response.success) {
                setStatus('connected', activeProvider + ' key valid — AI ready ✓');
                showMsg('✓ Connection successful!', 'success');
                // Auto-save on success
                const data = {};
                data[storageKey(activeProvider)] = key;
                data['delugeActiveProvider'] = activeProvider;
                chrome.storage.sync.set(data);
            } else {
                setStatus('disconnected', 'Key invalid or connection failed');
                showMsg('✗ ' + (response ? response.error : 'No response from extension.'), 'error');
            }
        }
    );
});

// ─────────────────────────────────────────
// Clear key
// ─────────────────────────────────────────
clearBtn.addEventListener('click', function () {
    chrome.storage.sync.remove(storageKey(activeProvider), function () {
        apiKeyInput.value = '';
        setStatus('disconnected', activeProvider + ' key removed');
        showMsg('API key cleared.', 'info');
    });
});

// ─────────────────────────────────────────
// Init — load last active provider
// ─────────────────────────────────────────
chrome.storage.sync.get(['delugeActiveProvider'], function (result) {
    const saved = result.delugeActiveProvider || 'grok';
    switchProvider(saved);
});
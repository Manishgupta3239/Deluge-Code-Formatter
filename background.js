// background.js — multi-provider: Grok, Claude, Gemini

// ── Script injection ────────────────────────
function injectScripts(tab, files) {
    if (!tab || !tab.url) return;
    const restricted = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];
    if (restricted.some(p => tab.url.startsWith(p))) return;
    if (!tab.url.includes('zoho.com') && !tab.url.includes('zoho.in') && !tab.url.includes('zoho.eu') && !tab.url.includes('zohoapis.com')) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: files
    }).then(() => {
        console.log('[Deluge Extension] Injected:', files);
    }).catch(err => {
        console.warn('[Deluge Extension] Injection skipped:', err.message);
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Inject formatter + semicolon checker on all Zoho pages
        setTimeout(function () {
            injectScripts(tab, ['formatter.js', 'inject-button.js', 'semicolon.js']);
        }, 1200);

        // Inject test data injector only on Create Lead page
        if (tab.url && tab.url.includes('/tab/Leads/create')) {
            setTimeout(function () {
                injectScripts(tab, ['test-data-injector.js']);
            }, 2000);
        }
    }
});

// ─────────────────────────────────────────
// Provider configs
// ─────────────────────────────────────────
function getProviderConfig(provider, apiKey) {
    switch (provider) {

        case 'grok':
            return {
                url: 'https://api.x.ai/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey,
                },
                buildBody: (messages, system, maxTokens) => ({
                    model: 'grok-3-mini',
                    max_tokens: maxTokens || 2048,
                    messages: system
                        ? [{ role: 'system', content: system }, ...messages]
                        : messages,
                }),
                parseResponse: (data) => {
                    console.log('[Deluge Grok] Response:', JSON.stringify(data).slice(0, 300));
                    if (data.choices && data.choices.length > 0) {
                        return { success: true, text: data.choices[0].message.content };
                    }
                    const errMsg = data.error
                        ? (data.error.message || JSON.stringify(data.error))
                        : JSON.stringify(data);
                    return { success: false, error: errMsg };
                },
            };

        case 'claude':
            return {
                url: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                buildBody: (messages, system, maxTokens) => ({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: maxTokens || 2048,
                    system: system || '',
                    messages,
                }),
                parseResponse: (data) => {
                    console.log('[Deluge Claude] Response:', JSON.stringify(data).slice(0, 300));
                    if (data.content && data.content[0]) {
                        return { success: true, text: data.content[0].text };
                    }
                    const errMsg = data.error
                        ? (data.error.message || JSON.stringify(data.error))
                        : JSON.stringify(data);
                    return { success: false, error: errMsg };
                },
            };

        case 'gemini':
            return {
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
                headers: {
                    'Content-Type': 'application/json',
                },
                buildBody: (messages, system, maxTokens) => ({
                    ...(system && { system_instruction: { parts: [{ text: system }] } }),
                    contents: messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }],
                    })),
                    generationConfig: { maxOutputTokens: maxTokens || 2048 },
                }),
                parseResponse: (data) => {
                    console.log('[Deluge Gemini] Response:', JSON.stringify(data).slice(0, 300));
                    if (data.candidates && data.candidates[0]) {
                        return { success: true, text: data.candidates[0].content.parts[0].text };
                    }
                    const errMsg = data.error
                        ? (data.error.message || JSON.stringify(data.error))
                        : JSON.stringify(data);
                    return { success: false, error: errMsg };
                },
            };

        default:
            return null;
    }
}

// ─────────────────────────────────────────
// Make API call
// ─────────────────────────────────────────
async function callProviderAPI(provider, apiKey, messages, system, maxTokens) {
    const config = getProviderConfig(provider, apiKey);
    if (!config) throw new Error('Unknown provider: ' + provider);

    console.log('[Deluge Extension] Calling', provider, 'API...');

    const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(config.buildBody(messages, system, maxTokens)),
    });

    const data = await response.json();
    return config.parseResponse(data);
}

// ─────────────────────────────────────────
// Message handler
// ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // ── Test API key ──
    if (message.type === 'TEST_API_KEY') {
        console.log('[Deluge Extension] Testing', message.provider, 'key...');

        callProviderAPI(
            message.provider,
            message.key,
            [{ role: 'user', content: 'Hi' }],
            null,
            10
        )
        .then(result => {
            console.log('[Deluge Extension] Test result:', result);
            sendResponse(result);
        })
        .catch(err => {
            console.error('[Deluge Extension] Test error:', err);
            sendResponse({ success: false, error: err.message });
        });

        return true;
    }

    // ── AI Chat ──
    if (message.type === 'AI_CHAT') {
        chrome.storage.sync.get(['delugeActiveProvider'], function (providerResult) {
            const provider = providerResult.delugeActiveProvider || 'grok';

            chrome.storage.sync.get(['delugeApiKey_' + provider], function (keyResult) {
                const apiKey = keyResult['delugeApiKey_' + provider];

                if (!apiKey) {
                    sendResponse({
                        success: false,
                        error: 'No API key saved. Click the extension icon to add your ' + provider + ' key.'
                    });
                    return;
                }

                callProviderAPI(provider, apiKey, message.messages, message.system, 2048)
                    .then(result => sendResponse(result))
                    .catch(err => sendResponse({ success: false, error: err.message }));
            });
        });

        return true;
    }
});
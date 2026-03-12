// background.js

function injectScripts(tab, files) {
    if (!tab || !tab.url) return;
    const restricted = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];
    if (restricted.some(p => tab.url.startsWith(p))) return;
    if (!/zoho\.(com|in)/.test(tab.url) && !tab.url.includes('zohoapis.com')) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: files
    }).then(() => {
        console.log('[Deluge Extension] Injected:', files);
    }).catch(err => {
        // Ignore errors for tabs that aren't ready
        console.warn('[Deluge Extension] Injection skipped:', err.message);
    });
}

// ── Toolbar icon click → format only ────────────────────────
chrome.action.onClicked.addListener((tab) => {
    injectScripts(tab, ['formatter.js', 'content.js']);
});

// ── Page fully loaded → inject everything ───────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Small delay to let Zoho's JS finish initializing
        setTimeout(function () {
            injectScripts(tab, ['formatter.js', 'inject-button.js', 'semicolon.js']);
        }, 1000);
    }
});

// ── Tab switched to → re-inject to catch freshly opened editors ─
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        if (chrome.runtime.lastError) return;
        // Inject with a delay so the editor has time to open
        setTimeout(function () {
            injectScripts(tab, ['formatter.js', 'inject-button.js', 'semicolon.js']);
        }, 1500);
    });
});
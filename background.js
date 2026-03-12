// background.js
// Service worker — handles toolbar icon click and auto-injects on Zoho pages.

function injectScripts(tab, files) {
    if (!tab.url) return;
    const restricted = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];
    if (restricted.some(p => tab.url.startsWith(p))) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: files
    }).then(() => {
        console.log('[Deluge Extension] Injected:', files, 'into', tab.url);
    }).catch(err => {
        console.error('[Deluge Extension] Injection failed:', err);
    });
}

// ── Toolbar icon click → run formatter ──────────────────────
chrome.action.onClicked.addListener((tab) => {
    injectScripts(tab, ['formatter.js', 'content.js']);
});

// ── Auto-inject on Zoho page load ───────────────────────────
// Injects: formatter (so button works), button, semicolon checker
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === 'complete' &&
        tab.url &&
        (tab.url.includes('zoho.com') || tab.url.includes('zohoapis.com'))
    ) {
        // formatter.js must come first so formatDeluge is available to the button
        injectScripts(tab, ['formatter.js', 'inject-button.js', 'semicolon.js']);
    }
});
// background.js
// Service worker — handles toolbar icon clicks and keyboard shortcuts.
// Two commands:
//   1. format-deluge   → injects formatter.js + content.js
//   2. check-semicolon → injects semicolon-checker.js

/**
 * Injects scripts into the active tab's MAIN world.
 */
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

// ── Keyboard shortcuts ───────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return;
        const tab = tabs[0];

        if (command === 'format-deluge') {
            // Ctrl+Shift+F → format code
            injectScripts(tab, ['formatter.js', 'content.js']);
        } else if (command === 'check-semicolon') {
            // Ctrl+Shift+S → activate semicolon checker
            injectScripts(tab, ['semicolon-checker.js']);
        }
    });
});

// ── Auto-inject semicolon checker when Zoho tab loads ───────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === 'complete' &&
        tab.url &&
        (tab.url.includes('zoho.com') || tab.url.includes('zohoapis.com'))
    ) {
        injectScripts(tab, ['semicolon-checker.js']);
    }
});
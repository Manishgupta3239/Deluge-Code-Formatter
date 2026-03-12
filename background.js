// background.js
// Service worker — handles toolbar icon click only.
// Injects formatter on click, auto-injects semicolon checker on Zoho page load.

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

// ── Auto-inject semicolon checker when Zoho tab fully loads ─
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === 'complete' &&
        tab.url &&
        (tab.url.includes('zoho.com') || tab.url.includes('zohoapis.com'))
    ) {
        injectScripts(tab, ['semicolon.js']);
    }
});
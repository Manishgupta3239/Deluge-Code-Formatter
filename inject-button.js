/**
 * inject-button.js
 * - Injects Format Code + semicolon Fix buttons into Zoho toolbar
 * - MutationObserver watches for BOTH toolbar AND CodeMirror to appear
 *   so everything works without reloading the tab
 */

(function () {
    'use strict';

    const FORMAT_BTN_ID = 'deluge-format-btn';
    const SEMI_COUNT_ID = 'deluge-semi-count';
    const SEMI_FIX_ID   = 'deluge-semi-fix';

    // ─────────────────────────────────────────
    // Button base style
    // ─────────────────────────────────────────
    function makeBtn(id, text, bgColor, extraStyle) {
        const btn = document.createElement('button');
        btn.id   = id;
        btn.type = 'button';
        btn.textContent = text;
        btn.style.cssText = [
            'border:none',
            'border-radius:4px',
            'padding:0 12px',
            'height:28px',
            'font-size:13px',
            'font-weight:500',
            'font-family:inherit',
            'cursor:pointer',
            'vertical-align:middle',
            'transition:background 0.2s',
            'background:' + bgColor,
            'color:#fff',
        ].concat(extraStyle || []).join(';');
        return btn;
    }

    // ─────────────────────────────────────────
    // Format Code button
    // ─────────────────────────────────────────
    function createFormatButton() {
        const btn = makeBtn(FORMAT_BTN_ID, 'Format Code', '#2962ff', ['margin-right:6px']);

        btn.addEventListener('mouseenter', function () { if (!btn.disabled) btn.style.background = '#1a4fcc'; });
        btn.addEventListener('mouseleave', function () { if (!btn.disabled) btn.style.background = '#2962ff'; });

        btn.addEventListener('click', function () {
            btn.textContent = 'Formatting...';
            btn.style.background = '#555';
            btn.disabled = true;

            try {
                const cmEl = document.querySelector('.CodeMirror');
                if (!cmEl || !cmEl.CodeMirror) { flashBtn(btn, 'No editor', '#e53935', 'Format Code', '#2962ff'); return; }
                if (typeof window.formatDeluge !== 'function') { flashBtn(btn, 'Reload page', '#e65100', 'Format Code', '#2962ff'); return; }

                const editor   = cmEl.CodeMirror;
                const original = editor.getValue();
                if (!original || !original.trim()) { flashBtn(btn, 'Empty!', '#e65100', 'Format Code', '#2962ff'); return; }

                const cursor = editor.getCursor();
                editor.setValue(window.formatDeluge(original));
                editor.setCursor(cursor);
                editor.focus();
                flashBtn(btn, '✓ Done!', '#2e7d32', 'Format Code', '#2962ff');

            } catch (e) {
                console.error('[Format Button] Error:', e);
                flashBtn(btn, 'Error!', '#e53935', 'Format Code', '#2962ff');
            }
        });

        return btn;
    }

    // ─────────────────────────────────────────
    // Semicolon count badge
    // ─────────────────────────────────────────
    function createSemiCount() {
        const el = document.createElement('span');
        el.id = SEMI_COUNT_ID;
        el.style.cssText = 'display:none;color:#e53935;font-size:12px;font-family:monospace;font-weight:bold;margin-right:4px;vertical-align:middle;';
        return el;
    }

    // ─────────────────────────────────────────
    // Semicolon Fix button
    // ─────────────────────────────────────────
    function createFixButton() {
        const btn = makeBtn(SEMI_FIX_ID, '⚡ Fix', '#e53935', ['margin-right:8px', 'display:none']);

        btn.addEventListener('mouseenter', function () { if (!btn.disabled) btn.style.background = '#b71c1c'; });
        btn.addEventListener('mouseleave', function () { if (!btn.disabled) btn.style.background = '#e53935'; });

        btn.addEventListener('click', function () {
            if (window.__delugeSemicolon && window.__delugeSemicolon.fix) {
                const fixed = window.__delugeSemicolon.fix();
                flashBtn(btn, '✓ ' + fixed + ' Fixed!', '#2e7d32', '⚡ Fix', '#e53935');
                const badge = document.getElementById(SEMI_COUNT_ID);
                if (badge) badge.style.display = 'none';
            }
        });

        return btn;
    }

    // ─────────────────────────────────────────
    // Flash a button then restore it
    // ─────────────────────────────────────────
    function flashBtn(btn, text, flashBg, restoreText, restoreBg) {
        btn.textContent = text;
        btn.style.background = flashBg;
        btn.disabled = true;
        setTimeout(function () {
            btn.textContent = restoreText;
            btn.style.background = restoreBg;
            btn.disabled = false;
        }, 2000);
    }

    // ─────────────────────────────────────────
    // Wire up semicolon count callback
    // ─────────────────────────────────────────
    function setupSemicolonCallback() {
        if (!window.__delugeSemicolon) window.__delugeSemicolon = {};

        window.__delugeSemicolon.onCount = function (count) {
            const badge  = document.getElementById(SEMI_COUNT_ID);
            const fixBtn = document.getElementById(SEMI_FIX_ID);
            if (!badge || !fixBtn) return;

            if (count === 0) {
                badge.style.display  = 'none';
                fixBtn.style.display = 'none';
            } else {
                badge.textContent    = '● ' + count + ' semicolon' + (count > 1 ? 's' : '');
                badge.style.display  = 'inline';
                fixBtn.textContent   = '⚡ Fix ' + count;
                fixBtn.style.background = '#e53935';
                fixBtn.style.display = 'inline-block';
                fixBtn.disabled      = false;
            }
        };
    }

    // ─────────────────────────────────────────
    // Inject buttons into toolbar
    // ─────────────────────────────────────────
    function injectButtons() {
        if (document.getElementById(FORMAT_BTN_ID)) return true;

        const container = document.querySelector('.dxe_fR');
        if (!container) return false;

        const closeBtn = container.querySelector('[data-zcqa="functionClosev2"]');
        if (!closeBtn) return false;

        const formatBtn = createFormatButton();
        const semiCount = createSemiCount();
        const fixBtn    = createFixButton();

        container.insertBefore(formatBtn, closeBtn);
        container.insertBefore(fixBtn, formatBtn);
        container.insertBefore(semiCount, fixBtn);

        setupSemicolonCallback();
        console.log('[Format Button] Injected into toolbar.');
        return true;
    }

    // ─────────────────────────────────────────
    // Attach semicolon checker to CodeMirror
    // Called whenever a new .CodeMirror element is detected
    // ─────────────────────────────────────────
    function tryAttachSemicolonChecker() {
        const els = document.querySelectorAll('.CodeMirror');
        for (const el of els) {
            const cm = el.CodeMirror;
            if (!cm) continue;

            // Already attached
            if (cm._delugeCheckerAttached) continue;

            // semicolon.js may not have run yet — wait for it
            if (!window.__delugeCheckerRunning) {
                // Reset flag so semicolon.js will run when injected
                window.__delugeCheckerRunning = undefined;
            }

            // If semicolon.js is loaded, its findAndAttach loop will pick this up.
            // Force it by temporarily marking as unattached and dispatching a check.
            if (window.__delugeSemicolon && window.__delugeSemicolon._cm === null) {
                // semicolon.js is loaded but hasn't found the editor yet
                // Directly attach via its internal mechanism
                cm._delugeCheckerAttached = false;
            }
        }
    }

    // ─────────────────────────────────────────
    // MutationObserver — watches for toolbar AND CodeMirror to appear
    // ─────────────────────────────────────────
    let lastCMCount = 0;

    function startObserver() {
        const observer = new MutationObserver(function () {
            // Try to inject toolbar buttons
            injectButtons();

            // Check if a new CodeMirror instance appeared
            const cms = document.querySelectorAll('.CodeMirror');
            if (cms.length !== lastCMCount) {
                lastCMCount = cms.length;
                if (cms.length > 0) {
                    // New editor appeared — give it 300ms to fully initialize then attach
                    setTimeout(function () {
                        tryAttachSemicolonChecker();

                        // Re-run semicolon.js attach loop by resetting the guard
                        // and letting its retry interval pick up the new editor
                        if (window.__delugeCheckerRunning && window.__delugeSemicolon) {
                            const newCm = document.querySelector('.CodeMirror');
                            if (newCm && newCm.CodeMirror && !newCm.CodeMirror._delugeCheckerAttached) {
                                // Reset so semicolon.js retries
                                window.__delugeCheckerRunning = false;
                                window.__delugeSemicolon._cm = null;
                            }
                        }
                    }, 300);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────
    setupSemicolonCallback();
    injectButtons();
    startObserver();

})();
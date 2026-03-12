/**
 * inject-button.js
 * Injects a "Format Code" button into the Zoho Deluge toolbar.
 * Targets the exact div.dxe_fR container where Close/Save/Associate buttons live.
 */

(function () {
    'use strict';

    const BUTTON_ID = 'deluge-format-btn';

    // ─────────────────────────────────────────
    // Create the Format Code button
    // Styled to match Zoho's dxEditorSecondaryBtn style
    // ─────────────────────────────────────────
    function createButton() {
        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.type = 'button';
        btn.textContent = 'Format Code';

        // Match Zoho's own button class so it blends in perfectly
        btn.className = 'lyte-button dxEditorSecondaryBtn lyteDefaultBtn';
        btn.style.cssText = [
            'margin-right:8px',
            'cursor:pointer',
            'background:#2962ff',
            'color:#fff',
            'border:none',
            'border-radius:4px',
            'padding:0 14px',
            'height:28px',
            'font-size:13px',
            'font-weight:500',
            'font-family:inherit',
            'transition:background 0.2s',
            'vertical-align:middle',
        ].join(';');

        btn.addEventListener('mouseenter', function () {
            if (!btn.disabled) btn.style.background = '#1a4fcc';
        });
        btn.addEventListener('mouseleave', function () {
            if (!btn.disabled) btn.style.background = '#2962ff';
        });

        btn.addEventListener('click', function () {
            runFormatter(btn);
        });

        return btn;
    }

    // ─────────────────────────────────────────
    // Run the formatter on click
    // ─────────────────────────────────────────
    function runFormatter(btn) {
        btn.textContent = 'Formatting...';
        btn.style.background = '#555';
        btn.disabled = true;

        try {
            const cmEl = document.querySelector('.CodeMirror');
            if (!cmEl || !cmEl.CodeMirror) {
                showResult(btn, 'No editor found', '#e53935');
                return;
            }

            if (typeof window.formatDeluge !== 'function') {
                showResult(btn, 'Reload page', '#e65100');
                console.error('[Format Button] formatDeluge not available.');
                return;
            }

            const editor = cmEl.CodeMirror;
            const original = editor.getValue();

            if (!original || original.trim() === '') {
                showResult(btn, 'Editor empty', '#e65100');
                return;
            }

            const formatted = window.formatDeluge(original);
            const cursor = editor.getCursor();
            editor.setValue(formatted);
            editor.setCursor(cursor);
            editor.focus();

            showResult(btn, '✓ Done!', '#2e7d32');

        } catch (e) {
            console.error('[Format Button] Error:', e);
            showResult(btn, 'Error!', '#e53935');
        }
    }

    function showResult(btn, text, color) {
        btn.textContent = text;
        btn.style.background = color;
        btn.disabled = true;
        setTimeout(function () {
            btn.textContent = 'Format Code';
            btn.style.background = '#2962ff';
            btn.disabled = false;
        }, 2000);
    }

    // ─────────────────────────────────────────
    // Inject into toolbar
    // Targets div.dxe_fR — the exact container with Close/Save/Associate
    // ─────────────────────────────────────────
    function injectButton() {
        // Already injected
        if (document.getElementById(BUTTON_ID)) return true;

        // Target the exact toolbar button container from the DOM
        const container = document.querySelector('.dxe_fR');
        if (!container) return false;

        // Find the Close lyte-button element
        // data-zcqa="functionClosev2" is the Close button's unique identifier
        const closeBtn = container.querySelector('[data-zcqa="functionClosev2"]');
        if (!closeBtn) return false;

        const btn = createButton();

        // Insert our button BEFORE the Close button
        container.insertBefore(btn, closeBtn);

        console.log('[Format Button] Injected successfully into toolbar.');
        return true;
    }

    // ─────────────────────────────────────────
    // MutationObserver — watches for toolbar to appear/reappear
    // Zoho loads the editor dynamically so we need this
    // ─────────────────────────────────────────
    function startObserver() {
        const observer = new MutationObserver(function () {
            // Remove stale button if toolbar was re-rendered
            const existing = document.getElementById(BUTTON_ID);
            if (existing && !document.querySelector('.dxe_fR')) {
                existing.remove();
            }
            injectButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    // ─────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────
    injectButton();
    startObserver();

})();
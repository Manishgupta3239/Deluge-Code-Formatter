/**
 * semicolon.js
 * Real-time missing semicolon detector for Zoho Deluge editor.
 */

(function () {
    'use strict';

    // Prevent double-injection
    if (window.__delugeCheckerRunning) return;
    window.__delugeCheckerRunning = true;

    const GUTTER_ID = 'deluge-semicolon-gutter';
    const DEBOUNCE_MS = 600;
    let debounceTimer = null;

    // ─────────────────────────────────────────
    // Patterns — lines that do NOT need a semicolon
    // ─────────────────────────────────────────
    const NO_SEMI = [
        /^\s*$/,
        /^\s*\/\//,
        /^\s*\{/,
        /^\s*\}/,
        /^\s*\[/,
        /^\s*\][\s;]*$/,
        /^\s*void\b/,
        /^\s*if\s*\(/,
        /^\s*else\b/,
        /^\s*for\b/,
        /^\s*while\s*\(/,
        /^\s*invokeurl\s*$/,
        /^\s*sendmail\s*$/,
        /^\s*(url|type|connection|parameters|from|to|bcc|subject|message)\s*:/i,
        /\{\s*$/,
        /^\s*break\s*$/,
        /^\s*continue\s*$/,
        /^\s*return\s*$/,
    ];

    function needsSemi(line) {
        const t = line.trim();
        if (!t) return false;
        for (const p of NO_SEMI) if (p.test(t)) return false;
        return true;
    }

    function isMissing(line) {
        return needsSemi(line) && !line.trim().endsWith(';');
    }

    // ─────────────────────────────────────────
    // Red dot marker
    // ─────────────────────────────────────────
    function makeMarker() {
        const dot = document.createElement('span');
        dot.title = 'Missing semicolon';
        dot.style.cssText = [
            'display:inline-block',
            'width:7px',
            'height:7px',
            'border-radius:50%',
            'background:#e53935',
            'margin-top:5px',
            'margin-left:2px',
            'box-shadow:0 0 4px rgba(229,57,53,0.8)',
        ].join(';');
        return dot;
    }

    // ─────────────────────────────────────────
    // Status bar
    // ─────────────────────────────────────────
    function updateBar(count) {
        let bar = document.getElementById('deluge-semi-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'deluge-semi-bar';
            bar.style.cssText = [
                'position:fixed',
                'bottom:0',
                'left:0',
                'right:0',
                'z-index:99999',
                'background:#1a1a2e',
                'color:#ccc',
                'font-size:12px',
                'font-family:monospace',
                'padding:4px 14px',
                'border-top:1px solid #333',
                'pointer-events:none',
            ].join(';');
            document.body.appendChild(bar);
        }
        bar.innerHTML = count === 0
            ? '<span style="color:#4caf50">✓</span>&nbsp; No missing semicolons'
            : '<span style="color:#e53935">●</span>&nbsp; <b style="color:#e53935">' + count + '</b> missing semicolon' + (count > 1 ? 's' : '');
    }

    // ─────────────────────────────────────────
    // Run the check
    // ─────────────────────────────────────────
    function runCheck(cm) {
        try {
            cm.clearGutter(GUTTER_ID);
            let count = 0;
            const total = cm.lineCount();
            for (let i = 0; i < total; i++) {
                if (isMissing(cm.getLine(i))) {
                    cm.setGutterMarker(i, GUTTER_ID, makeMarker());
                    count++;
                }
            }
            updateBar(count);
        } catch (e) {
            console.warn('[Deluge Semicolon] runCheck error:', e);
        }
    }

    // ─────────────────────────────────────────
    // Attach to CodeMirror
    // ─────────────────────────────────────────
    function attach(cm) {
        if (cm._delugeCheckerAttached) return;
        cm._delugeCheckerAttached = true;

        try {
            // Add our custom gutter
            const existing = cm.getOption('gutters') || [];
            if (!existing.includes(GUTTER_ID)) {
                cm.setOption('gutters', existing.concat([GUTTER_ID]));
            }

            // Inject CSS
            if (!document.getElementById('deluge-semi-css')) {
                const s = document.createElement('style');
                s.id = 'deluge-semi-css';
                s.textContent = '.deluge-semicolon-gutter { width: 12px !important; background: #111; }';
                document.head.appendChild(s);
            }

            // Listen for changes
            cm.on('change', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () { runCheck(cm); }, DEBOUNCE_MS);
            });

            // Initial check
            runCheck(cm);

            // Toast
            const toast = document.createElement('div');
            toast.textContent = '● Semicolon checker active';
            toast.style.cssText = [
                'position:fixed',
                'top:20px',
                'right:20px',
                'z-index:999999',
                'background:#1565c0',
                'color:#fff',
                'padding:8px 16px',
                'border-radius:6px',
                'font:13px sans-serif',
                'box-shadow:0 4px 12px rgba(0,0,0,.3)',
                'transition:opacity .4s ease',
            ].join(';');
            document.body.appendChild(toast);
            setTimeout(function () {
                toast.style.opacity = '0';
                setTimeout(function () { toast.remove(); }, 400);
            }, 2500);

            console.log('[Deluge Semicolon] Attached successfully.');

        } catch (e) {
            console.error('[Deluge Semicolon] Attach error:', e);
        }
    }

    // ─────────────────────────────────────────
    // Find CodeMirror and attach
    // ─────────────────────────────────────────
    function findAndAttach() {
        try {
            const els = document.querySelectorAll('.CodeMirror');
            for (const el of els) {
                if (el.CodeMirror) {
                    attach(el.CodeMirror);
                    return true;
                }
            }
        } catch (e) {
            console.warn('[Deluge Semicolon] findAndAttach error:', e);
        }
        return false;
    }

    // Try now, retry every 500ms up to 15 seconds if editor not ready
    if (!findAndAttach()) {
        let tries = 0;
        const interval = setInterval(function () {
            tries++;
            if (findAndAttach() || tries >= 30) {
                clearInterval(interval);
                if (tries >= 30) {
                    console.warn('[Deluge Semicolon] Could not find CodeMirror after 30 attempts.');
                }
            }
        }, 500);
    }

})();
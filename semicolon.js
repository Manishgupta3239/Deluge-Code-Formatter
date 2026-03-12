/**
 * semicolon.js
 * Detects missing semicolons in Zoho Deluge code.
 * Shows a red dot in the CodeMirror gutter next to lines missing a semicolon.
 * Runs in real-time as you type, and also when first injected.
 */

(function () {
    const GUTTER_ID = 'deluge-semicolon-gutter';
    const DEBOUNCE_MS = 600;
    let debounceTimer = null;

    // ─────────────────────────────────────────────
    // Patterns — lines that do NOT need a semicolon
    // ─────────────────────────────────────────────
    const NO_SEMI_PATTERNS = [
        /^\s*$/,                                        // empty
        /^\s*\/\//,                                     // comment
        /^\s*\{/,                                       // opening brace
        /^\s*\}/,                                       // closing brace
        /^\s*\[/,                                       // opening bracket
        /^\s*\][\s;]*$/,                                // closing bracket
        /^\s*void\b/,                                   // function declaration
        /^\s*if\s*\(/,                                  // if (
        /^\s*else\s*if\s*\(/,                           // else if (
        /^\s*else\s*[\{\s]*$/,                          // else / else {
        /^\s*for\b/,                                    // for / for each
        /^\s*while\s*\(/,                               // while (
        /^\s*invokeurl\s*$/,                            // invokeurl
        /^\s*sendmail\s*$/,                             // sendmail
        /^\s*(url|type|connection|parameters|from|to|bcc|subject|message)\s*:/i,
        /\{\s*$/,                                       // ends with {
        /^\s*break\s*$/,                                // break
        /^\s*continue\s*$/,                             // continue
        /^\s*return\s*$/,                               // bare return
    ];

    function needsSemicolon(line) {
        const t = line.trim();
        if (!t) return false;
        for (const p of NO_SEMI_PATTERNS) {
            if (p.test(t)) return false;
        }
        return true;
    }

    function isMissing(line) {
        if (!needsSemicolon(line)) return false;
        const t = line.trim();
        return !t.endsWith(';');
    }

    // ─────────────────────────────────────────────
    // Gutter marker (red dot)
    // ─────────────────────────────────────────────
    function makeMarker() {
        const dot = document.createElement('span');
        dot.title = 'Missing semicolon';
        dot.style.cssText = `
            display: inline-block;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #e53935;
            margin-top: 5px;
            margin-left: 2px;
            box-shadow: 0 0 4px rgba(229,57,53,0.8);
        `;
        return dot;
    }

    // ─────────────────────────────────────────────
    // Status bar at bottom
    // ─────────────────────────────────────────────
    function updateStatusBar(count) {
        let bar = document.getElementById('deluge-semi-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'deluge-semi-bar';
            bar.style.cssText = `
                position: fixed;
                bottom: 0; left: 0; right: 0;
                z-index: 99999;
                background: #1a1a2e;
                color: #ccc;
                font-size: 12px;
                font-family: monospace;
                padding: 4px 14px;
                border-top: 1px solid #333;
                pointer-events: none;
            `;
            document.body.appendChild(bar);
        }
        bar.innerHTML = count === 0
            ? `<span style="color:#4caf50">✓</span>&nbsp; No missing semicolons`
            : `<span style="color:#e53935">●</span>&nbsp; <b style="color:#e53935">${count}</b> missing semicolon${count > 1 ? 's' : ''}`;
    }

    // ─────────────────────────────────────────────
    // Core check — runs against CodeMirror instance
    // ─────────────────────────────────────────────
    function runCheck(cm) {
        cm.clearGutter(GUTTER_ID);
        let count = 0;
        const total = cm.lineCount();
        for (let i = 0; i < total; i++) {
            if (isMissing(cm.getLine(i))) {
                cm.setGutterMarker(i, GUTTER_ID, makeMarker());
                count++;
            }
        }
        updateStatusBar(count);
    }

    // ─────────────────────────────────────────────
    // Attach to a CodeMirror instance
    // ─────────────────────────────────────────────
    function attach(cm) {
        if (cm._delugeCheckerAttached) return;
        cm._delugeCheckerAttached = true;

        // Add our gutter — must update the gutters option
        const gutters = cm.getOption('gutters') || [];
        if (!gutters.includes(GUTTER_ID)) {
            // Clone array so CodeMirror detects the change
            cm.setOption('gutters', gutters.concat([GUTTER_ID]));
        }

        // Inject gutter CSS once
        if (!document.getElementById('deluge-semi-css')) {
            const s = document.createElement('style');
            s.id = 'deluge-semi-css';
            s.textContent = `
                .deluge-semicolon-gutter {
                    width: 12px !important;
                    background: #111;
                }
            `;
            document.head.appendChild(s);
        }

        // Real-time check on change
        cm.on('change', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => runCheck(cm), DEBOUNCE_MS);
        });

        // Run immediately
        runCheck(cm);
        console.log('[Deluge Semicolon] Attached.');

        // Show brief toast
        const t = document.createElement('div');
        t.textContent = '● Semicolon checker active';
        t.style.cssText = `
            position:fixed; top:20px; right:20px; z-index:999999;
            background:#1565c0; color:#fff; padding:8px 16px;
            border-radius:6px; font:13px sans-serif;
            box-shadow:0 4px 12px rgba(0,0,0,.3); opacity:1;
            transition:opacity .4s ease;
        `;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2000);
    }

    // ─────────────────────────────────────────────
    // Find CodeMirror and attach
    // ─────────────────────────────────────────────
    function findAndAttach() {
        const els = document.querySelectorAll('.CodeMirror');
        for (const el of els) {
            if (el.CodeMirror) {
                attach(el.CodeMirror);
                return true;
            }
        }
        return false;
    }

    // Try immediately, retry if editor not ready yet
    if (!findAndAttach()) {
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (findAndAttach() || tries >= 20) clearInterval(t);
        }, 500);
    }

})();
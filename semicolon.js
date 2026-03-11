/**
 * semicolon-checker.js
 * Detects missing semicolons in Zoho Deluge code and shows
 * a red dot in the CodeMirror gutter in real-time.
 *
 * - Does NOT modify any existing code (formatter.js, content.js, background.js)
 * - Works independently, injected separately via background.js
 */

(function () {
    const GUTTER_ID = 'deluge-semicolon-gutter';
    const CHECKER_INTERVAL = 800; // ms debounce for real-time checking
    let debounceTimer = null;
    let activeEditor = null;

    // ─────────────────────────────────────────────
    // Lines that do NOT need a semicolon at the end
    // ─────────────────────────────────────────────
    const NO_SEMICOLON_PATTERNS = [
        /^\s*\/\//,                          // comment lines
        /^\s*\{/,                            // opening brace
        /^\s*\}/,                            // closing brace
        /^\s*\[/,                            // opening bracket (invokeurl)
        /^\s*\];?\s*$/,                      // closing bracket
        /^\s*$/,                             // empty line
        /^\bvoid\b/,                         // function declaration
        /^\s*if\s*\(/,                       // if (...)
        /^\s*else\s*if\s*\(/,               // else if (...)
        /^\s*else\s*$/,                      // else
        /^\s*else\s*\{/,                     // else {
        /^\s*for\s+each\b/,                  // for each
        /^\s*for\s*\(/,                      // for (
        /^\s*while\s*\(/,                    // while (
        /^\s*invokeurl\s*$/,                 // invokeurl
        /^\s*sendmail\s*$/,                  // sendmail
        /^\s*(url|type|connection|parameters|from|to|bcc|subject|message)\s*:/i, // bracket block params
        /\{\s*$/,                            // line ending with {
        /^\s*return\s*$/,                    // bare return
    ];

    /**
     * Returns true if a line is expected to have a semicolon.
     */
    function lineNeedsSemicolon(line) {
        const trimmed = line.trim();
        if (trimmed === '') return false;
        for (const pattern of NO_SEMICOLON_PATTERNS) {
            if (pattern.test(trimmed)) return false;
        }
        return true;
    }

    /**
     * Returns true if the line is MISSING a semicolon it should have.
     */
    function isMissingSemicolon(line) {
        const trimmed = line.trim();
        if (!lineNeedsSemicolon(trimmed)) return false;
        // Line needs a semicolon but doesn't end with one
        return !trimmed.endsWith(';');
    }

    /**
     * Creates the red dot marker element for the gutter.
     */
    function makeGutterMarker() {
        const dot = document.createElement('div');
        dot.className = 'deluge-semicolon-marker';
        dot.title = 'Missing semicolon';
        dot.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #e53935;
            margin-top: 4px;
            margin-left: 3px;
            cursor: pointer;
            box-shadow: 0 0 3px rgba(229,57,53,0.7);
        `;
        return dot;
    }

    /**
     * Runs the semicolon check on the editor and updates gutter markers.
     */
    function runCheck(editor) {
        if (!editor) return;

        const totalLines = editor.lineCount();
        editor.clearGutter(GUTTER_ID);

        let errorCount = 0;

        for (let i = 0; i < totalLines; i++) {
            const lineText = editor.getLine(i);
            if (isMissingSemicolon(lineText)) {
                editor.setGutterMarker(i, GUTTER_ID, makeGutterMarker());
                errorCount++;
            }
        }

        updateStatusBar(errorCount);
    }

    /**
     * Shows/updates a small status bar at the bottom of the editor.
     */
    function updateStatusBar(count) {
        let bar = document.getElementById('deluge-semicolon-statusbar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'deluge-semicolon-statusbar';
            bar.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 99998;
                background: #1e1e1e;
                color: #ccc;
                font-size: 12px;
                font-family: monospace;
                padding: 3px 12px;
                border-top: 1px solid #333;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(bar);
        }

        if (count === 0) {
            bar.innerHTML = `<span style="color:#4caf50;">✓</span> No missing semicolons`;
        } else {
            bar.innerHTML = `<span style="color:#e53935;">●</span> <strong style="color:#e53935;">${count}</strong> missing semicolon${count > 1 ? 's' : ''} detected`;
        }
    }

    /**
     * Injects the custom gutter into CodeMirror and starts listening.
     */
    function attachToEditor(editor) {
        if (editor._semicolonCheckerAttached) return;
        editor._semicolonCheckerAttached = true;
        activeEditor = editor;

        // Add our custom gutter to CodeMirror
        const existingGutters = editor.getOption('gutters') || [];
        if (!existingGutters.includes(GUTTER_ID)) {
            editor.setOption('gutters', [...existingGutters, GUTTER_ID]);
        }

        // Inject gutter CSS
        injectStyles();

        // Real-time: check on every change with debounce
        editor.on('change', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => runCheck(editor), CHECKER_INTERVAL);
        });

        // Run immediately on attach
        runCheck(editor);

        console.log('[Deluge Semicolon Checker] Attached to editor.');
        showToast('Semicolon checker active', 'info');
    }

    /**
     * Injects CSS for the gutter column.
     */
    function injectStyles() {
        if (document.getElementById('deluge-semicolon-styles')) return;
        const style = document.createElement('style');
        style.id = 'deluge-semicolon-styles';
        style.textContent = `
            .${GUTTER_ID} {
                width: 14px !important;
                background: #1e1e1e;
                border-right: 1px solid #333;
            }
            .deluge-semicolon-marker:hover {
                transform: scale(1.3);
                transition: transform 0.1s;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Small toast notification.
     */
    function showToast(message, type = 'info') {
        const colors = { info: '#1565c0', success: '#2e7d32', error: '#c62828' };
        const existing = document.getElementById('deluge-checker-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'deluge-checker-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 999999;
            background: ${colors[type]};
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-family: sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 1;
            transition: opacity 0.4s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 2000);
    }

    /**
     * Finds the CodeMirror editor and attaches the checker.
     */
    function findAndAttach() {
        const cmElements = document.querySelectorAll('.CodeMirror');
        for (const cmEl of cmElements) {
            if (cmEl.CodeMirror) {
                attachToEditor(cmEl.CodeMirror);
                return true;
            }
        }
        return false;
    }

    // ─────────────────────────────────────────────
    // Entry point
    // Called both on icon click (manual) and on page load (real-time setup)
    // ─────────────────────────────────────────────
    if (!findAndAttach()) {
        // Editor might not be ready yet — retry a few times
        let attempts = 0;
        const retryInterval = setInterval(() => {
            attempts++;
            if (findAndAttach() || attempts > 20) {
                clearInterval(retryInterval);
            }
        }, 500);
    }

})();
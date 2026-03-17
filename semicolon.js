/**
 * semicolon.js
 * Real-time missing semicolon detector for Zoho Deluge editor.
 * Uses paren-depth tracking to avoid false positives inside
 * multi-line function calls like zoho.crm.updateRecord(..., {"trigger":{"workflow"}});
 */

(function () {
    'use strict';

    if (window.__delugeCheckerRunning) return;
    window.__delugeCheckerRunning = true;

    const GUTTER_ID   = 'deluge-semicolon-gutter';
    const DEBOUNCE_MS = 600;
    let debounceTimer = null;

    // ─────────────────────────────────────────
    // Strip inline comment from end of line
    // e.g. 'x = 1; // comment' → 'x = 1;'
    // Handles quoted strings so '//' inside strings is ignored
    // ─────────────────────────────────────────
    function stripInlineComment(line) {
        let inStr = false, strCh = '';
        for (let i = 0; i < line.length - 1; i++) {
            const ch = line[i];
            if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strCh = ch; continue; }
            if (inStr && ch === strCh && line[i - 1] !== '\\') { inStr = false; continue; }
            if (!inStr && ch === '/' && line[i + 1] === '/') {
                return line.slice(0, i).trimEnd();
            }
        }
        return line;
    }

    // ─────────────────────────────────────────
    // Lines that never need a semicolon
    // ─────────────────────────────────────────
    const NO_SEMI = [
        /^\s*$/,
        /^\s*\/\//,                // line comment
        /^\s*\/\*/,                // FIX: block comment start  /* ... */
        /^\s*\*[\s/]/,             // FIX: block comment middle/end  * ...  or  */
        /^\s*\{/,
        /^\s*\}/,
        /^\s*\[/,
        /^\s*\][\s;]*$/,
        /^\s*void\b/,
        /^\s*if\s*\(/,
        /^\s*else\b/,
        /^\s*for\b/,
        /^\s*while\s*\(/,
        /invokeurl\s*$/,
        /sendmail\s*$/,
        /^\s*try\s*$/,
        /^\s*catch\s*/,
        /^\s*finally\s*$/,
        /^\s*(url|type|connection|parameters|from|to|cc|bcc|subject|message|headers)\s*:/i,
        /\{\s*$/,
        /,\s*$/,
        /^\s*"[^"]*"\s*:/,
        /^\s*'[^']*'\s*:/,
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

    // ─────────────────────────────────────────
    // Check if line already ends with semicolon
    // strips inline comment first:
    // 'x = 1; // note' → ends with ';' ✓
    // ─────────────────────────────────────────
    function hasSemicolon(line) {
        const stripped = stripInlineComment(line).trim();
        return stripped.endsWith(';');
    }

    // ─────────────────────────────────────────
    // Count unquoted open/close parens in a line
    // ─────────────────────────────────────────
    function countParens(line) {
        let depth = 0, inStr = false, strCh = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strCh = ch; continue; }
            if (inStr && ch === strCh && line[i - 1] !== '\\') { inStr = false; continue; }
            if (!inStr) {
                if (ch === '(') depth++;
                else if (ch === ')') depth--;
            }
        }
        return depth;
    }

    // ─────────────────────────────────────────
    // Track block comments across lines
    // ─────────────────────────────────────────
    function isInsideBlockComment(line, blockCommentActive) {
        const t = line.trim();
        if (blockCommentActive) {
            // Still inside block comment — check if it ends here
            if (t.includes('*/')) return { skip: true, active: false };
            return { skip: true, active: true };
        }
        // Check if block comment starts on this line
        if (t.startsWith('/*')) {
            // Does it also end on same line?
            if (t.includes('*/')) return { skip: true, active: false };
            return { skip: true, active: true };
        }
        return { skip: false, active: false };
    }

    // ─────────────────────────────────────────
    // Scan all lines — return line numbers missing semicolons
    // ─────────────────────────────────────────
    function getMissingLines(cm) {
        const missing = [];
        let parenDepth = 0;
        let inBlockComment = false;
        const total = cm.lineCount();

        for (let i = 0; i < total; i++) {
            const line = cm.getLine(i);

            // Block comment tracking
            const bc = isInsideBlockComment(line, inBlockComment);
            inBlockComment = bc.active;
            if (bc.skip) continue;

            const delta = countParens(line);

            // Inside open paren = multi-line argument, skip
            if (parenDepth > 0) {
                parenDepth += delta;
                continue;
            }

            if (needsSemi(line) && !hasSemicolon(line)) {
                missing.push(i);
            }

            parenDepth += delta;
            if (parenDepth < 0) parenDepth = 0;
        }
        return missing;
    }

    // ─────────────────────────────────────────
    // Red dot gutter marker
    // ─────────────────────────────────────────
    function makeMarker() {
        const dot = document.createElement('span');
        dot.title = 'Missing semicolon';
        dot.style.cssText = 'display:inline-block;width:7px;height:7px;border-radius:50%;background:#e53935;margin-top:5px;margin-left:2px;box-shadow:0 0 4px rgba(229,57,53,0.8);';
        return dot;
    }

    // ─────────────────────────────────────────
    // Fix — insert semicolons on all missing lines
    // ─────────────────────────────────────────
    function fixAllSemicolons(cm) {
        const missingLines = getMissingLines(cm);
        if (missingLines.length === 0) return 0;

        cm.operation(function () {
            for (const lineNum of missingLines) {
                const lineText = cm.getLine(lineNum);
                // Insert before inline comment if present
                const stripped = stripInlineComment(lineText);
                const insertAt = stripped.length;
                cm.replaceRange(';',
                    { line: lineNum, ch: insertAt },
                    { line: lineNum, ch: insertAt }
                );
            }
        });

        return missingLines.length;
    }

    // ─────────────────────────────────────────
    // Run the full check
    // ─────────────────────────────────────────
    function runCheck(cm) {
        try {
            cm.clearGutter(GUTTER_ID);
            const missing = getMissingLines(cm);
            for (const lineNum of missing) {
                cm.setGutterMarker(lineNum, GUTTER_ID, makeMarker());
            }
            if (window.__delugeSemicolon && window.__delugeSemicolon.onCount) {
                window.__delugeSemicolon.onCount(missing.length);
            }
        } catch (e) {
            console.warn('[Deluge Semicolon] runCheck error:', e);
        }
    }

    // ─────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────
    window.__delugeSemicolon = {
        onCount: null,
        fix: function () {
            const cm = window.__delugeSemicolon._cm;
            if (!cm) return 0;
            const fixed = fixAllSemicolons(cm);
            setTimeout(function () { runCheck(cm); }, 100);
            return fixed;
        },
        recheck: function () {
            const cm = window.__delugeSemicolon._cm;
            if (cm) runCheck(cm);
        },
        _cm: null,
    };

    // ─────────────────────────────────────────
    // Attach to CodeMirror
    // ─────────────────────────────────────────
    function attach(cm) {
        if (cm._delugeCheckerAttached) return;
        cm._delugeCheckerAttached = true;
        window.__delugeSemicolon._cm = cm;
        window.__delugeCheckerRunning = true;

        try {
            const existing = cm.getOption('gutters') || [];
            if (!existing.includes(GUTTER_ID)) {
                cm.setOption('gutters', existing.concat([GUTTER_ID]));
            }

            if (!document.getElementById('deluge-semi-css')) {
                const s = document.createElement('style');
                s.id = 'deluge-semi-css';
                s.textContent = '.deluge-semicolon-gutter{width:12px !important;background:#111;}';
                document.head.appendChild(s);
            }

            cm.on('change', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () { runCheck(cm); }, DEBOUNCE_MS);
            });

            runCheck(cm);
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
                if (el.CodeMirror && !el.CodeMirror._delugeCheckerAttached) {
                    attach(el.CodeMirror);
                    return true;
                }
            }
        } catch (e) {
            console.warn('[Deluge Semicolon] findAndAttach error:', e);
        }
        return false;
    }

    findAndAttach();

    let tries = 0;
    const interval = setInterval(function () {
        tries++;
        if (window.__delugeCheckerRunning === false) {
            window.__delugeCheckerRunning = true;
            const els = document.querySelectorAll('.CodeMirror');
            for (const el of els) {
                if (el.CodeMirror) el.CodeMirror._delugeCheckerAttached = false;
            }
        }
        if (findAndAttach() || tries >= 120) clearInterval(interval);
    }, 500);

})();
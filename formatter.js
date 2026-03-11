/**
 * formatter.js
 * Formats Zoho Deluge code — handles both normal and minified (single-line) code.
 * Output style: VS Code style with tabs, proper spacing, invokeurl/sendmail blocks.
 */

// ─────────────────────────────────────────────────────────────
// STEP 1: DE-MINIFIER
// Splits compressed single-line Deluge into logical lines
// ─────────────────────────────────────────────────────────────
function deminify(code) {
    // If code already has newlines it doesn't need deminifying
    const newlineCount = (code.match(/\n/g) || []).length;
    const lineCount = code.split('\n').filter(l => l.trim()).length;
    if (newlineCount > 5 && lineCount > 5) return code;

    const result = [];
    let i = 0;
    let current = '';
    let inString = false;
    let stringChar = '';
    let bracketDepth = 0; // depth inside [ ] blocks (invokeurl/sendmail)

    function flush() {
        const t = current.trim();
        if (t) result.push(t);
        current = '';
    }

    while (i < code.length) {
        const ch = code[i];
        const remaining = code.slice(i);

        // ── String tracking ──
        if (!inString && (ch === '"' || ch === "'")) {
            inString = true;
            stringChar = ch;
            current += ch;
            i++;
            continue;
        }
        if (inString && ch === stringChar && code[i - 1] !== '\\') {
            inString = false;
            current += ch;
            i++;
            continue;
        }
        if (inString) {
            current += ch;
            i++;
            continue;
        }

        // ── invokeurl [ ──
        const invokeMatch = remaining.match(/^(invokeurl)\s*\[/);
        if (invokeMatch) {
            flush();
            result.push('invokeurl');
            i += invokeMatch[0].length - 1; // position at [
            continue;
        }

        // ── sendmail [ ──
        const sendmailMatch = remaining.match(/^(sendmail)\s*\[/);
        if (sendmailMatch) {
            flush();
            result.push('sendmail');
            i += sendmailMatch[0].length - 1; // position at [
            continue;
        }

        // ── [ opens bracket block ──
        if (ch === '[') {
            flush();
            result.push('[');
            bracketDepth++;
            i++;
            continue;
        }

        // ── ] closes bracket block ──
        if (ch === ']') {
            flush();
            bracketDepth--;
            const next = code[i + 1];
            result.push(next === ';' ? '];' : ']');
            i += next === ';' ? 2 : 1;
            continue;
        }

        // ── Inside bracket block: split on invokeurl param keywords ──
        if (bracketDepth > 0 && ch === ' ') {
            const ahead = remaining.slice(1);
            if (ahead.match(/^(url|type|connection|parameters|from|to|bcc|subject|message)\s*:/i)) {
                flush();
                i++;
                continue;
            }
        }

        // ── { opens a code block — always on its own line, content after it on next line ──
        if (ch === '{') {
            flush();
            result.push('{');
            i++;
            // Skip whitespace immediately after {
            while (i < code.length && (code[i] === ' ' || code[i] === '\t')) i++;
            continue;
        }

        // ── } closes a code block — flush anything before it, then put } on own line ──
        if (ch === '}') {
            flush();
            result.push('}');
            i++;
            continue;
        }

        // ── ; ends a statement ──
        if (ch === ';') {
            current += ch;
            if (bracketDepth === 0) {
                flush();
                // Skip whitespace after ;
                while (i + 1 < code.length && (code[i + 1] === ' ' || code[i + 1] === '\t')) i++;
            }
            i++;
            continue;
        }

        current += ch;
        i++;
    }

    flush();
    return result.filter(l => l !== '').join('\n');
}

// ─────────────────────────────────────────────────────────────
// STEP 1.5: Ensure { and } are always on their own lines
// Works on already-multiline code, string-aware
// ─────────────────────────────────────────────────────────────
function splitBracesOntoOwnLines(code) {
    const lines = code.split('\n');
    const out = [];
    let inBracketBlock = false;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();

        // Track bracket blocks (invokeurl/sendmail) — don't split inside them
        if (trimmed === '[') { inBracketBlock = true; out.push(rawLine); continue; }
        if (trimmed === ']' || trimmed === '];') { inBracketBlock = false; out.push(rawLine); continue; }
        if (inBracketBlock) { out.push(rawLine); continue; }

        // Comment lines — never split, push as-is
        if (trimmed.startsWith('//')) { out.push(trimmed); continue; }

        // Lines that are purely { or } — already fine
        if (trimmed === '{' || trimmed === '}') { out.push(rawLine); continue; }

        // Split this line character by character, string-aware
        let current = '';
        let inStr = false;
        let strChar = '';

        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];

            if (!inStr && (ch === '"' || ch === "'")) {
                inStr = true; strChar = ch;
                current += ch; continue;
            }
            if (inStr && ch === strChar && trimmed[i - 1] !== '\\') {
                inStr = false;
                current += ch; continue;
            }
            if (inStr) { current += ch; continue; }

            // Once we hit // in non-string context, rest of line is a comment — keep it whole
            if (ch === '/' && trimmed[i + 1] === '/') {
                current += trimmed.slice(i);
                break;
            }

            if (ch === '{') {
                if (current.trim()) out.push(current.trim());
                out.push('{');
                current = '';
                while (i + 1 < trimmed.length && trimmed[i + 1] === ' ') i++;
                continue;
            }
            if (ch === '}') {
                if (current.trim()) out.push(current.trim());
                out.push('}');
                current = '';
                continue;
            }
            if (ch === ';') {
                current += ch;
                // Check if rest of line is a comment — keep it on same line
                let rest = trimmed.slice(i + 1).trim();
                if (rest.startsWith('//')) {
                    current += ' ' + rest;
                    out.push(current.trim());
                    current = '';
                    break; // done with this line
                }
                if (current.trim()) out.push(current.trim());
                current = '';
                while (i + 1 < trimmed.length && trimmed[i + 1] === ' ') i++;
                continue;
            }
            current += ch;
        }
        if (current.trim()) out.push(current.trim());
    }

    return out.join('\n');
}

// ─────────────────────────────────────────────────────────────
// STEP 2: FORMATTER
// Takes properly-split lines and applies VS Code style formatting
// ─────────────────────────────────────────────────────────────
function formatDeluge(code) {
    if (!code) return '';

    // Normalize line endings
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // De-minify first if needed
    code = deminify(code);

    // Join "varname =\ninvokeurl" back onto one line: "varname = invokeurl"
    code = code.replace(/([a-zA-Z_]\w*\s*=)\s*\n\s*(invokeurl|sendmail)/g, '$1 $2');

    // Ensure { and } are always on their own lines (handles already-multiline code too)
    // We do this string-aware to avoid breaking string contents
    code = splitBracesOntoOwnLines(code);

    const lines = code.split('\n');
    const result = [];
    let indentLevel = 0;
    const TAB = '\t';
    let inBracketBlock = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line === '') {
            // Strip all blank lines — formatter controls spacing
            continue;
        }

        const isBracketOpen  = line === '[';
        const isBracketClose = line === '];' || line === ']';
        const isBlockClose   = line === '}';
        const isBlockOpen    = line === '{';

        // ── Decrease indent BEFORE closing tokens ──
        if (isBlockClose || isBracketClose) {
            indentLevel = Math.max(0, indentLevel - 1);
            if (isBracketClose) inBracketBlock = false;
        }

        // ── Format line content ──
        let formatted;
        if (inBracketBlock && !isBracketOpen && !isBracketClose) {
            formatted = formatBracketLine(line);
        } else if (!isBracketOpen && !isBracketClose && !isBlockOpen && !isBlockClose) {
            formatted = formatCodeLine(line);
        } else {
            formatted = line;
        }

        result.push(TAB.repeat(indentLevel) + formatted);

        // ── Increase indent AFTER opening tokens ──
        if (isBlockOpen) {
            indentLevel++;
        } else if (isBracketOpen) {
            indentLevel++;
            inBracketBlock = true;
        }
    }

    // Remove trailing blank lines
    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
    }

    return result.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Line-level formatters
// ─────────────────────────────────────────────────────────────

function formatCodeLine(line) {
    if (line.startsWith('//')) return line;

    // Keywords: space before (
    line = line.replace(/\bif\s*\(/g, 'if (');
    line = line.replace(/\belse if\s*\(/g, 'else if (');
    line = line.replace(/\bwhile\s*\(/g, 'while (');
    line = line.replace(/\bfor each\s+/g, 'for each  ');

    // Comparison operators (before = handling)
    line = line.replace(/\s*(==)\s*/g, ' == ');
    line = line.replace(/\s*(!=)\s*/g, ' != ');
    line = line.replace(/\s*(>=)\s*/g, ' >= ');
    line = line.replace(/\s*(<=)\s*/g, ' <= ');

    // && and ||
    line = line.replace(/\s*&&\s*/g, ' && ');
    line = line.replace(/\s*\|\|\s*/g, ' || ');

    // Assignment =, + operator, comma spacing (all skip strings)
    line = processAssignmentSpacing(line);
    line = processPlus(line);
    line = processCommaSpacing(line);

    // Space before {
    line = line.replace(/\)\s*\{/g, ') {');

    // Collapse multiple spaces (not tabs)
    line = line.replace(/([^\t]) {2,}/g, '$1 ');

    return line;
}

function formatBracketLine(line) {
    if (line.startsWith('//')) return line;
    // key:value → key : value (skip URLs like https://)
    line = line.replace(/^(\w[\w\s]*?)\s*:\s*(?!\/\/)/, '$1 : ');
    return line;
}

// ─────────────────────────────────────────────────────────────
// String-aware operator helpers
// ─────────────────────────────────────────────────────────────

function processAssignmentSpacing(line) {
    return applyOutsideStrings(line, text =>
        text.replace(/([^=!<>+\-*\/\s])=([^>=\s])/g, '$1 = $2')
    );
}

function processPlus(line) {
    return applyOutsideStrings(line, text =>
        text
            .replace(/([^+\s])\+([^+=\s])/g, '$1 + $2')
            .replace(/([^+\s])\+\s/g,         '$1 + ')
            .replace(/\s\+([^+=\s])/g,         ' + $1')
    );
}

function processCommaSpacing(line) {
    return applyOutsideStrings(line, text =>
        text.replace(/,([^\s])/g, ', $1')
    );
}

/**
 * Applies a transform function only to the non-string parts of a line.
 */
function applyOutsideStrings(line, fn) {
    const parts = splitByStrings(line);
    return parts.map(({ text, isString }) => isString ? text : fn(text)).join('');
}

/**
 * Splits a line into {text, isString} segments.
 */
function splitByStrings(line) {
    const parts = [];
    let current = '';
    let inStr = false;
    let strChar = '';

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (!inStr && (ch === '"' || ch === "'")) {
            if (current) parts.push({ text: current, isString: false });
            current = ch;
            inStr = true;
            strChar = ch;
        } else if (inStr && ch === strChar && line[i - 1] !== '\\') {
            current += ch;
            parts.push({ text: current, isString: true });
            current = '';
            inStr = false;
        } else {
            current += ch;
        }
    }
    if (current) parts.push({ text: current, isString: inStr });
    return parts;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatDeluge, deminify };
}
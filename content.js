// content.js
// Injected into the MAIN world by background.js on icon click or keyboard shortcut.
// Relies on formatDeluge being globally available from formatter.js (injected just before).

function findAndFormatEditor() {

    // ─────────────────────────────────────────────
    // Strategy 1: CodeMirror (Zoho CRM / Deluge IDE)
    // ─────────────────────────────────────────────
    try {
        const cmElements = document.querySelectorAll('.CodeMirror');
        for (let cmEl of cmElements) {
            if (cmEl.CodeMirror) {
                const editor = cmEl.CodeMirror;
                const originalCode = editor.getValue();

                if (!originalCode || originalCode.trim() === '') {
                    showToast('Editor is empty — nothing to format.', 'warning');
                    return;
                }

                const formattedCode = window.formatDeluge(originalCode);
                const cursor = editor.getCursor();
                editor.setValue(formattedCode);
                editor.setCursor(cursor);
                editor.focus();

                console.log('[Deluge Formatter] Formatted via CodeMirror.');
                showToast('✓ Deluge code formatted!', 'success');
                return;
            }
        }
    } catch (e) {
        console.error('[Deluge Formatter] CodeMirror strategy failed:', e);
    }

    // ─────────────────────────────────────────────
    // Strategy 2: ACE Editor
    // ─────────────────────────────────────────────
    try {
        const aceEl = document.querySelector('.ace_editor');
        if (aceEl && window.ace) {
            const editor = window.ace.edit(aceEl);
            const originalCode = editor.getValue();
            if (!originalCode || originalCode.trim() === '') {
                showToast('Editor is empty — nothing to format.', 'warning');
                return;
            }
            editor.setValue(window.formatDeluge(originalCode), -1);
            console.log('[Deluge Formatter] Formatted via ACE.');
            showToast('✓ Deluge code formatted!', 'success');
            return;
        }
    } catch (e) {
        console.error('[Deluge Formatter] ACE strategy failed:', e);
    }

    // ─────────────────────────────────────────────
    // Strategy 3: Monaco Editor
    // ─────────────────────────────────────────────
    try {
        if (window.monaco && window.monaco.editor) {
            const editors = window.monaco.editor.getEditors();
            if (editors.length > 0) {
                const editor = editors[0];
                const originalCode = editor.getValue();
                if (!originalCode || originalCode.trim() === '') {
                    showToast('Editor is empty — nothing to format.', 'warning');
                    return;
                }
                const position = editor.getPosition();
                editor.setValue(window.formatDeluge(originalCode));
                if (position) editor.setPosition(position);
                console.log('[Deluge Formatter] Formatted via Monaco.');
                showToast('✓ Deluge code formatted!', 'success');
                return;
            }
        }
    } catch (e) {
        console.error('[Deluge Formatter] Monaco strategy failed:', e);
    }

    // ─────────────────────────────────────────────
    // Strategy 4: Plain Textarea
    // ─────────────────────────────────────────────
    try {
        const textareas = document.querySelectorAll('textarea');
        for (let ta of textareas) {
            if (ta.offsetParent !== null && !ta.classList.contains('inputarea')) {
                const originalCode = ta.value;
                if (!originalCode || originalCode.trim() === '') continue;
                ta.value = window.formatDeluge(originalCode);
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[Deluge Formatter] Formatted via textarea.');
                showToast('✓ Deluge code formatted!', 'success');
                return;
            }
        }
    } catch (e) {
        console.error('[Deluge Formatter] Textarea strategy failed:', e);
    }

    console.warn('[Deluge Formatter] No supported editor found.');
    showToast('No Deluge editor detected on this page.', 'error');
}

/**
 * Shows a floating toast notification.
 */
function showToast(message, type = 'success') {
    const existing = document.getElementById('deluge-formatter-toast');
    if (existing) existing.remove();

    const colors = { success: '#2e7d32', warning: '#e65100', error: '#c62828' };

    const toast = document.createElement('div');
    toast.id = 'deluge-formatter-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: ${colors[type] || colors.success};
        color: #fff;
        padding: 10px 18px;
        border-radius: 6px;
        font-size: 14px;
        font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 1;
        transition: opacity 0.4s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

findAndFormatEditor();
# Zoho Deluge Formatter — Chrome Extension

A Chrome extension that formats Zoho Deluge code directly in the browser editor, with real-time missing semicolon detection.

---

## Features

- **One-click formatting** — formats your entire Deluge script instantly via the toolbar icon
- **VS Code-style output** — tabs for indentation, proper spacing around operators, clean `if / else / for` blocks
- **Minified code support** — handles compressed single-line code and expands it into readable format
- **`invokeurl` / `sendmail` block formatting** — properly indents bracket blocks with `key : value` spacing
- **Real-time semicolon checker** — shows a red dot in the gutter next to any line missing a `;`
- **Keyboard shortcuts** — format or check without touching the mouse
- **Toast notifications** — instant feedback on format success or errors

---

## File Structure

```
zoho-deluge-formatter/
│
├── manifest.json           # Extension config, permissions, shortcuts
├── background.js           # Service worker — handles clicks & shortcuts
├── formatter.js            # Core formatting + deminify logic
├── content.js              # Editor detection & format trigger
├── semicolon-checker.js    # Real-time missing semicolon detector
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the extension folder
6. The extension icon will appear in your Chrome toolbar

---

## Usage

### Format Code
| Method | Action |
|--------|--------|
| Click the toolbar icon | Formats the code in the active Deluge editor |
| `Ctrl + Shift + F` | Formats via keyboard shortcut |
| `Cmd + Shift + F` | Formats on Mac |

### Semicolon Checker
| Method | Action |
|--------|--------|
| `Ctrl + Shift + S` | Manually activates the semicolon checker |
| Auto on page load | Checker activates automatically on any Zoho page |

Once active, the checker runs in real-time as you type — a **red dot** appears in the line gutter next to any statement missing a semicolon. A status bar at the bottom shows the total count.

---

## How Formatting Works

The formatter runs in three stages:

1. **Deminify** — if the code is compressed onto a single line, it is expanded into proper lines by splitting on `;`, `{`, `}`, and bracket block keywords
2. **Split braces** — ensures `{` and `}` are always on their own lines, even in already-multiline code
3. **Format** — applies VS Code-style rules line by line:
   - Tabs for indentation
   - Space after keywords: `if (`, `else if (`, `while (`
   - Spaces around `=`, `==`, `!=`, `>=`, `<=`, `&&`, `||`
   - Space after commas
   - `invokeurl` / `sendmail` blocks: `key : value` spacing
   - Comments (`//`) are preserved exactly as written

---

## Supported Editors

The extension detects and works with the following editor types used across Zoho:

| Priority | Editor | Used In |
|----------|--------|---------|
| 1st | CodeMirror | Zoho CRM Deluge IDE |
| 2nd | ACE Editor | Some Zoho pages |
| 3rd | Monaco Editor | Fallback |
| 4th | Plain Textarea | Last resort |

---

## Semicolon Checker — Smart Detection

The checker knows which lines do **not** need a semicolon and skips them automatically:

- Comment lines (`//`)
- Block openers/closers (`{`, `}`, `[`, `]`)
- Keywords: `if (`, `else`, `for each`, `while (`, `invokeurl`, `sendmail`
- `invokeurl` / `sendmail` parameter lines (`url :`, `type :`, `connection :`, etc.)
- Function declarations (`void`)

---

## Permissions

| Permission | Reason |
|------------|--------|
| `scripting` | Inject formatter scripts into the page |
| `activeTab` | Access the currently active tab |
| `tabs` | Auto-inject semicolon checker on Zoho page load |
| `https://*.zoho.com/*` | Works on all Zoho domains |
| `https://*.zoho.in/*` | Works on Zoho India domain |
| `https://*.zohoapis.com/*` | Works on Zoho API pages |

---

## Keyboard Shortcuts

Shortcuts can be customized at `chrome://extensions/shortcuts`

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + F` | Format Deluge code |
| `Ctrl + Shift + S` | Activate semicolon checker |

---

## Known Limitations

- Formatting works best when the Zoho Deluge IDE is fully loaded before clicking the extension
- The semicolon checker attaches to the first CodeMirror instance found on the page
- SQL strings inside `queryMap.put(...)` are not reformatted (intentional — preserves query integrity)

---

## Changelog

### v1.1
- Added real-time semicolon checker with gutter markers
- Added auto-inject on Zoho page load
- Added `Ctrl+Shift+S` keyboard shortcut for checker

### v1.0
- Initial release
- One-click Deluge code formatter
- VS Code-style formatting with tabs
- Minified code support
- `invokeurl` / `sendmail` block formatting
- CodeMirror, ACE, Monaco, and textarea support
- Toast notifications
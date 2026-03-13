# Contributing to Quasar AI

Thanks for your interest in contributing! Quasar AI is a single-file, no-backend AI chat app built with vanilla HTML, CSS, and JavaScript. This guide will help you get started.

---

## Project Structure

Quasar AI is intentionally kept as a **single file** (`index.html`). Everything — HTML, CSS, and JS — lives in one place. This is by design to keep deployment as simple as possible (just push to GitHub Pages). We might change the project structure when the project becomes big, but for now the **single file** method is recommended for ease.

```
QuasarAI-BYOK/
├── assistant.html       # The entire app
├── README.md            # User-facing documentation
├── Code-Edits.md        # Track of code commits
├── CONTRIBUTING.md      # This file
└── LICENSE              # MIT License
```

---

## Getting Started

No build tools, no npm, no installs required.

1. Fork the repository
2. Clone it locally
3. Open `index.html` directly in your browser
4. Make your changes
5. Test locally, then submit a pull request

That's it — no `npm install`, no dev server needed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML + CSS |
| Logic | Vanilla JavaScript (ES2020+) |
| Markdown | marked.js (CDN) |
| OCR | Tesseract.js (CDN) |
| Auth + Sync | Appwrite Cloud (Singapore) |
| AI Providers (supported) | Groq, OpenAI, Anthropic (More might be added in future) |
| Hosting | GitHub Pages |

---

## Current Providers

The app supports these API providers. Each uses a different key prefix for auto-detection:

| Provider | Key Prefix | Models Endpoint |
|---|---|---|
| Groq | `gsk_` | Live fetch |
| OpenAI | `sk-` | Live fetch |
| Anthropic | `sk-ant-` | Hardcoded (no public endpoint) |

> More providers (Gemini, OpenRouter) are planned for v1.4 or above.

---

## Appwrite Setup

The app uses Appwrite Cloud for auth and chat sync. The current configuration:

- **Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Project ID:** `69b25dcc002da2046dd6`
- **Database ID:** `69b2944f0031df986393`
- **Collection ID:** `69b2954c002f7aff0f92`

### Collection Attributes

| Attribute  | Type   | Size       | Required |
|---|---|---|---|
| `userId`   | String | 64        | ✅        |
| `title`    | String | 256       | ✅        |
| `history`  | String | 1,000,000 | ✅        |
| `updatedAt`| Integer| —         | ✅        |     

### Permissions
Collection permissions: `Users` role → Read, Create, Update, Delete.

---

## Coding Guidelines

- **Keep it single-file.** Don't split into separate CSS or JS files.
- **No frameworks.** No React, Vue, or any frontend framework.
- **No build tools.** No webpack, vite, or bundlers.
- **CDN only** for external libraries.
- Use CSS variables (`--accent`, `--text`, `--surface`, etc.) for all colours so dark/light mode works automatically.
- Follow the existing code style — functions are grouped by section with `// ── Section ──` comments.

---

## Feature Sections in Code

The JS is organised into clearly labelled sections:

```
// ── State ──
// ── Persist ──
// ── Chat management ──
// ── Render ──
// ── Send / API ──
// ── Files ──
// ── Voice ──
// ── Settings ──
// ── Theme ──
// ── Sidebar ──
// ── Keyboard shortcuts ──
// ── Appwrite ──
```

When adding new features, add them to the relevant section or create a new labelled section at the end.

---

## Version History

| Version | Date | Focus |
|---|---|---|
| v1.0 | 10 Mar 2026 | Initial layout, BYOK setup, chat UI |
| v1.1 | 11 Mar 2026 | OCR, voice recognition, chat history, theme toggle |
| v1.2 | 12 Mar 2026 | Full mobile support, sidebar overlay |
| v1.3 | 12 Mar 2026 | Appwrite auth, Google OAuth, cross-device sync, model selector |

---

## Planned for v1.4 (or later)

- [ ] Google Gemini support
- [ ] OpenRouter support (one key, 100+ models)
- [ ] Code block copy buttons
- [ ] Rename chat by clicking the title

---

## Submitting a Pull Request

1. Make sure the app works locally in Chrome/Safari/Firefox
2. Test on mobile if your change affects layout
3. Update the `README.md` if you've changed user-facing features
4. Add an entry to the version history in this file
5. Keep your PR focused — one feature or fix per PR

---

## License

Quasar AI is MIT licensed. By contributing, you agree your contributions will be licensed under the same MIT License.

Copyright (c) 2026 Shashvath Puppala

--
## Note

Any other updates will be mentioned, as we progress. Thanks for contributing again.

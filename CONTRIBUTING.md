# Contributing to Quasar AI

Thanks for your interest in contributing! Quasar AI is a lightweight, browser-based AI chat client — no build step, no bundler, just plain HTML, CSS, and vanilla JS. This doc covers everything you need to get up and running.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Development Guidelines](#development-guidelines)
- [Adding a New AI Provider](#adding-a-new-ai-provider)
- [Working with the Artifact Panel](#working-with-the-artifact-panel)
- [Styling Conventions](#styling-conventions)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Bug Reports & Feature Requests](#bug-reports--feature-requests)

---

## Project Structure

```
quasar-ai/
├── index.html       # App shell, all DOM structure
├── script.js        # All application logic (state, API calls, UI)
├── styles.css       # Custom CSS (Tailwind handles utilities)
└── CONTRIBUTING.md  # You are here
```

There is intentionally no build pipeline. Everything runs directly in the browser — open `https://quasar-ai-two.vercel.app` and you're developing.

---

## Getting Started

1. **Open in browser**
   Open [QuasarAI](https://quasar-ai-two.vercel.app)

2. **Add an API key** via the Settings panel (⚙️) to test with a real model.

No `npm install`, no `.env` files, no compilation needed.

---

## Architecture Overview

### State

A single `state` object is the source of truth for the entire app. It is persisted to `localStorage` on every mutation via `saveState()`.

```js
let state = {
    keys: {},        // Provider API keys
    models: {},      // Available models per provider
    chats: {},       // All chat histories, keyed by ID
    currentChatId,
    selectedModel,   // Format: "providerKey|modelId"
    theme,
    sidebarCollapsed
};
```

### Key Sections in `script.js`

| Section | Responsibility |
|---|---|
| State & Constants | `LANG_ICONS`, `PREVIEWABLE_LANGS`, `SYSTEM_PROMPT`, initial state shape |
| Init | `init()` — bootstraps everything from localStorage |
| Artifact Panel | `openArtifactPanel()`, `closeArtifactPanel()`, `switchPanelTab()` |
| Resize Handle | `setupResizeHandle()` — mouse + touch drag logic |
| Message UI | `appendMessageUI()`, `parseMessageSegments()`, `buildArtifactCard()` |
| Chat Management | CRUD for chats, `renderChat()`, `renderChatList()` |
| API Layer | `callAIProvider()` — normalized interface for all providers |
| Settings | `renderProviderSettings()`, `saveAndFetch()`, `updateModelSelector()` |

### Message Rendering Flow

```
AI response text
      │
      ▼
parseMessageSegments()   ← splits into { type: 'text' | 'code', content, lang }
      │
      ├─ type: 'text'  → marked.parse() → prose div
      │
      └─ type: 'code'  → buildArtifactCard()  → "Open" button
                                │
                                ▼
                        openArtifactPanel()  → slide-in side panel
```

---

## Development Guidelines

### General

- **No dependencies beyond CDN links.** Tailwind CSS, marked.js, and Font Awesome are loaded via CDN in `index.html`. Do not introduce a package manager or bundler without discussion.
- **Keep `script.js` organized by section.** Each logical area has a `// --- SECTION NAME ---` comment header. Add new code in the appropriate section.
- **Avoid touching the DOM directly from the API layer.** `callAIProvider()` returns a string. UI concerns live in the message/chat functions.
- **Always call `saveState()` after mutating `state`.** No exceptions.

### Code Style

- Use `const` by default, `let` when reassignment is needed.
- Prefer `document.createElement` + property assignment over large `innerHTML` strings for elements that need event listeners — it avoids the need for global function references.
- Inline `onclick="..."` in HTML strings is acceptable for simple actions already defined as global functions. For anything complex, use `addEventListener`.
- Keep functions focused. If a function is doing more than one clear thing, split it.

### System Prompt

The `SYSTEM_PROMPT` constant at the top of `script.js` is injected into **every** API call across all providers. If you modify it, verify the change works correctly with at least two different providers, since each provider maps it differently (`system` field for Anthropic, `systemInstruction` for Google, a system-role message for OpenAI-compatible APIs).

---

## Adding a New AI Provider

1. **Add an entry to `DEFAULT_PROVIDERS`** in `script.js`:
   ```js
   yourprovider: {
       name: "Your Provider",
       url: "https://api.yourprovider.com/v1/models",  // models list endpoint
       link: "https://yourprovider.com/api-keys"        // link to get a key
   }
   ```

2. **Add the key slot to initial `state`**:
   ```js
   let state = {
       keys: { ..., yourprovider: '' },
       models: { ..., yourprovider: [] },
       ...
   };
   ```

3. **Handle model fetching in `saveAndFetch()`** if the models endpoint has a non-standard response shape (see the `google` branch for an example of custom parsing).

4. **Add a branch in `callAIProvider()`**:
   ```js
   } else if (provider === 'yourprovider') {
       url = 'https://api.yourprovider.com/v1/chat/completions';
       headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
       body = { model: modelId, messages: openAiMessages };  // adjust as needed
   }
   ```
   Also handle response extraction at the bottom of `callAIProvider()`.

5. If the provider is OpenAI-compatible (most are), you can often just add it to the `else` block URL list with no other changes.

---

## Working with the Artifact Panel

The artifact panel is a persistent right-side pane. Key facts:

- It is **not** recreated on each open — it lives in the DOM at all times and is shown/hidden via CSS transforms + `hidden` class.
- Width is stored in `artifactPanel.width` (as a percentage) and survives across opens within the same session.
- The `PREVIEWABLE_LANGS` array controls which languages get a **Preview** tab. Currently `['html', 'svg']`. To add a new previewable type, add it here and handle the iframe content construction in `switchPanelTab()`.
- The iframe uses `sandbox="allow-scripts allow-same-origin allow-forms"` — be conservative about expanding sandbox permissions.

To add a new language icon, add an entry to `LANG_ICONS`:
```js
const LANG_ICONS = {
    ...,
    yourlang: 'fas fa-code',  // any Font Awesome 6 icon class
};
```

---

## Styling Conventions

- **Tailwind utility classes** handle layout, spacing, and color in `index.html`.
- **`styles.css`** handles anything Tailwind can't: animations, custom components (`.artifact-card`, `.artifact-panel`, `.resize-handle`), scrollbar styling, and transitions.
- Use CSS custom properties for anything that needs to respond to dark mode within `styles.css`. Tailwind's `dark:` prefix handles dark mode in the HTML.
- Do not add `!important` unless you are explicitly overriding a Tailwind base style (like `.prose pre`).
- The dark background for code areas is `#0d1117` (panel) / `#161b22` (header) — matching GitHub's dark code palette. Keep code-adjacent UI consistent with this.

---

## Submitting a Pull Request

1. Fork the repo and create a branch from `main` in your fork, then make your changes.

2. Test in both light and dark mode, and with at least one real API provider if your change touches the API layer.

3. Keep commits focused. One logical change per commit.

4. Open a PR against `main` with:
   - A clear title (`feat:`, `fix:`, `refactor:`, `docs:` prefix)
   - A short description of what changed and why
   - Screenshots or a screen recording if the change is visual

5. PRs that touch `callAIProvider()` or `SYSTEM_PROMPT` should note which providers were tested.

---

## Bug Reports & Feature Requests

Open a GitHub Issue and include:

- **For bugs:** browser + version, which provider/model was active, steps to reproduce, and the browser console output if relevant.
- **For features:** a clear description of the problem it solves, and whether you're willing to implement it.

---

Questions? Open a Discussion on GitHub.
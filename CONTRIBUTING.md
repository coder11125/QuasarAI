# Contributing to Quasar AI

Thanks for your interest in contributing! Quasar AI is a multi-provider AI chat client with a vanilla JS frontend and a TypeScript/Node.js backend. This doc covers everything you need to get up and running.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Development Guidelines](#development-guidelines)
- [Adding a New AI Provider](#adding-a-new-ai-provider)
- [Working with the Artifact Panel](#working-with-the-artifact-panel)
- [Adding a New API Route](#adding-a-new-api-route)
- [Styling Conventions](#styling-conventions)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Bug Reports & Feature Requests](#bug-reports--feature-requests)

---

## Project Structure

```
quasar-ai/
├── index.html            # App shell, all DOM structure
├── script.js             # All frontend logic (state, API calls, UI)
├── styles.css            # Custom CSS (Tailwind handles utilities)
├── vercel.json           # Vercel routing config
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript compiler config
├── api/
│   ├── auth/
│   │   ├── register.ts   # POST /api/auth/register
│   │   ├── login.ts      # POST /api/auth/login
│   │   └── me.ts         # GET  /api/auth/me
│   ├── data/
│   │   ├── save.ts       # POST /api/data/save  (keys + selectedModel)
│   │   └── load.ts       # GET  /api/data/load  (keys + selectedModel)
│   └── chats/
│       ├── list.ts       # GET    /api/chats/list   (all chats for user)
│       ├── save.ts       # POST   /api/chats/save   (upsert one chat)
│       └── delete.ts     # DELETE /api/chats/delete (delete one chat)
└── lib/
    ├── db.ts              # MongoDB connection helper
    ├── jwt.ts             # Token sign/verify
    ├── crypto.ts          # AES-256-GCM encrypt/decrypt for API keys
    ├── authMiddleware.ts  # requireAuth() for protecting routes
    ├── rateLimit.ts       # checkRateLimit() for auth routes
    └── models/
        ├── User.ts        # User mongoose schema
        ├── UserData.ts    # API keys + selectedModel schema
        ├── Chat.ts        # Per-chat schema (one document per chat)
        └── RateLimit.ts   # Rate limit tracking schema (TTL-indexed)
```

---

## Getting Started

### Frontend
No build step needed. Open [quasar-ai-two.vercel.app](https://quasar-ai-two.vercel.app), create an account, add an API key in Settings and start chatting.

### Backend (local development)
1. Clone the repo
2. Run `npm install`
3. Create a `.env` file in the root (never commit this):
```
JWT_SECRET=your-long-random-secret
MONGODB_URI=your-mongodb-uri
ENCRYPTION_KEY=your-64-char-hex-string
```

Generate each secret:
```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY
```

4. Use [Vercel CLI](https://vercel.com/docs/cli) to run locally:
```bash
npm i -g vercel
vercel dev
```

This starts a local server that mirrors the Vercel serverless environment including env vars and API routes.

---

## Architecture Overview

### Frontend State

A single `state` object is the source of truth for the frontend. It is persisted to `localStorage` on every mutation via `saveState()`, which also debounces syncs to MongoDB.

```js
let state = {
    keys: {},         // Provider API keys
    models: {},       // Available models per provider
    chats: {},        // All chat histories, keyed by chatId
    currentChatId,
    selectedModel,    // Format: "providerKey|modelId"
    theme,
    sidebarCollapsed
};
```

### Data Flow

```
User makes change
      │
      ▼
saveState(changedChatId?)
      │
      ├─ localStorage (instant, local cache)
      │
      ├─ syncToServer() after 2s debounce
      │       │
      │       ▼
      │   POST /api/data/save → MongoDB (keys + selectedModel only)
      │
      └─ syncChat(chatId) after 2s debounce  [if changedChatId provided]
              │
              ▼
          POST /api/chats/save → MongoDB (single chat document)
```

On login/page load:
```
checkAuthOnLoad()
      │
      ├─ GET /api/auth/me  →  valid token?
      │        │
      │        └─ yes → hideAuthScreen() → loadFromServer()
      │                        │
      │                        ▼
      │               GET /api/data/load  ─┐
      │               GET /api/chats/list ─┘ (parallel)
      │                        │
      │                        ▼
      │               merge into state → re-render UI
      │
      └─ no → showAuthScreen()
```

### Key Sections in `script.js`

| Section | Responsibility |
|---|---|
| State & Constants | `LANG_ICONS`, `PREVIEWABLE_LANGS`, `SYSTEM_PROMPT`, initial state |
| Auth | `handleLogin()`, `handleRegister()`, `handleLogout()`, `checkAuthOnLoad()` |
| Server Sync | `syncToServer()`, `syncChat()`, `deleteServerChat()`, `loadFromServer()` |
| Init | `init()` — bootstraps everything, calls `checkAuthOnLoad()` |
| Artifact Panel | `openArtifactPanel()`, `closeArtifactPanel()`, `switchPanelTab()` |
| Message UI | `appendMessageUI()`, `parseMessageSegments()`, `buildArtifactCard()` |
| Chat Management | CRUD for chats, `renderChat()`, `renderChatList()` |
| API Layer | `callAIProvider()` — normalized interface for all providers |
| Settings | `renderProviderSettings()`, `saveAndFetch()`, `updateModelSelector()` |
| OCR | `runOcr()`, `openOcrModal()`, `insertOcrText()` |

### Message Rendering Flow

```
AI response text
      │
      ▼
parseMessageSegments()   ← splits into { type: 'text' | 'code', content, lang }
      │
      ├─ type: 'text'  → marked.parse() → prose div
      │
      └─ type: 'code'  → buildArtifactCard() → "Open" button
                                │
                                ▼
                        openArtifactPanel() → slide-in side panel
```

### Backend Auth Flow

```
POST /api/auth/register or /api/auth/login
      │
      ▼
checkRateLimit() → 10 attempts per IP per 15 min (stored in MongoDB)
      │
      ▼
connectDB() → MongoDB
      │
      ▼
bcrypt.hash/compare password
      │
      ▼
signToken() → JWT (7d expiry)
      │
      ▼
{ token, user } → frontend saves to localStorage
```

Protected routes use `requireAuth(req, res)` from `lib/authMiddleware.ts` which extracts and verifies the Bearer token. A 401 response on any authenticated request triggers a graceful logout on the frontend with a "session expired" toast.

### API Key Encryption

API keys are encrypted with AES-256-GCM before being written to MongoDB, using the `ENCRYPTION_KEY` environment variable. The format stored in the DB is `iv:authTag:ciphertext` (all hex). Decryption happens in `api/data/load.ts` before keys are returned to the frontend. Keys that are not in this format (e.g. existing plaintext keys during migration) are returned as-is.

---

## Development Guidelines

### Frontend

- **No dependencies beyond CDN links.** Tailwind CSS, marked.js, and Font Awesome are loaded via CDN. Do not introduce a bundler without discussion.
- **Keep `script.js` organized by section.** Each area has a `// --- SECTION NAME ---` comment header.
- **Avoid touching the DOM directly from the API layer.** `callAIProvider()` returns a string — UI concerns live in the message/chat functions.
- **Always call `saveState(chatId)` after mutating a chat**, and `saveState()` (no argument) for non-chat state changes (theme, model selection, etc.). This ensures both localStorage and MongoDB stay in sync correctly.
- **Always use `escapeHtml()` before injecting user-controlled strings into `innerHTML`.** This includes chat titles, file names, API key values, and error messages. Values from constants or the app's own code do not need escaping.

### Backend

- **All backend files are TypeScript** (`.ts`) — do not add `.js` files to `api/` or `lib/`.
- **Always call `await connectDB()`** at the top of every API handler before any DB operations. This handles connection caching for serverless environments.
- **Always use `requireAuth(req, res)`** to protect routes that need authentication. It returns `null` and sends a 401 automatically if the token is missing or invalid.
- **Always use `checkRateLimit(action, req, res)`** at the top of auth endpoints (login, register). It returns `false` and sends a 429 automatically if the limit is exceeded.
- **Never log sensitive data** (passwords, tokens, API keys) in `console.log` or `console.error`.
- **Never store API keys in plaintext.** Use `encryptKeys()` from `lib/crypto.ts` before writing to MongoDB and `decryptKeys()` after reading.

### Code Style

- Use `const` by default, `let` when reassignment is needed.
- Prefer `document.createElement` + property assignment over large `innerHTML` strings for elements that need event listeners.
- Inline `onclick="..."` in HTML strings is acceptable for simple global functions. Use `addEventListener` for anything complex.
- Keep functions focused. If a function does more than one clear thing, split it.
- Backend: use explicit TypeScript types everywhere. Avoid `any` unless absolutely necessary.

### System Prompt

The `SYSTEM_PROMPT` constant in `script.js` is injected into **every** API call across all providers. If you modify it, verify with at least two different providers since each maps it differently (`system` for Anthropic, `systemInstruction` for Google, system-role message for OpenAI-compatible APIs).

---

## Adding a New AI Provider

1. **Add an entry to `DEFAULT_PROVIDERS`** in `script.js`:
```js
yourprovider: {
    name: "Your Provider",
    url: "https://api.yourprovider.com/v1/models",
    link: "https://yourprovider.com/api-keys"
}
```

2. **Add the key slot to initial `state`**:
```js
let state = {
    keys: { ..., yourprovider: '' },
    models: { ..., yourprovider: [] },
};
```

3. **Add the key slot to `UserData.ts`** model so it persists to MongoDB:
```ts
keys: {
    ...,
    yourprovider: { type: String, default: '' },
}
```

4. **Handle model fetching in `saveAndFetch()`** if the models endpoint has a non-standard response shape.

5. **Add a branch in `callAIProvider()`**:
```js
} else if (provider === 'yourprovider') {
    url = 'https://api.yourprovider.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = { model: modelId, messages: openAiMessages };
}
```

6. If the provider is OpenAI-compatible, you can usually just add its URL to the existing `else` block with no other changes.

---

## Working with the Artifact Panel

The artifact panel is a persistent right-side pane:

- It lives in the DOM at all times — shown/hidden via CSS transforms and the `hidden` class, not recreated.
- Width is stored in `artifactPanel.width` (percentage) and survives across opens within the same session.
- `PREVIEWABLE_LANGS` controls which languages get a **Preview** tab. Currently `['html', 'svg']`. To add a new type, add it here and handle iframe content in `switchPanelTab()`.
- The iframe uses `sandbox="allow-scripts allow-same-origin allow-forms"` — be conservative about expanding sandbox permissions.

To add a new language icon, add an entry to `LANG_ICONS`:
```js
const LANG_ICONS = {
    ...,
    yourlang: 'fas fa-code', // any Font Awesome 6 icon class
};
```

---

## Adding a New API Route

1. Create a new `.ts` file in `api/` (e.g. `api/feature/action.ts`)
2. Use this template:
```ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const user = requireAuth(req, res);
    if (!user) return; // 401 already sent

    try {
        await connectDB();
        // your logic here
        res.status(200).json({ message: 'Success' });
    } catch (err) {
        console.error('Handler error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
```
3. Call it from the frontend using `getAuthToken()` in the `Authorization` header.

---

## Styling Conventions

- **Tailwind utility classes** handle layout, spacing, and color in `index.html`.
- **`styles.css`** handles animations, custom components (`.artifact-card`, `.artifact-panel`, `.resize-handle`, `#authScreen`), scrollbar styling, and transitions.
- Use Tailwind's `dark:` prefix for dark mode in HTML. Use CSS custom properties for dark mode inside `styles.css`.
- Do not add `!important` unless explicitly overriding a Tailwind base style.
- Code area background colors: `#0d1117` (panel), `#161b22` (header) — matching GitHub's dark palette. Keep code-adjacent UI consistent.

---

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Test in both light and dark mode
3. For backend changes: test with `vercel dev` locally
4. For API layer changes: test with at least one real provider
5. Keep commits focused — one logical change per commit
6. Open a PR against `main` with:
   - A clear title (`feat:`, `fix:`, `refactor:`, `docs:`, `security:` prefix)
   - A short description of what changed and why
   - Screenshots or a screen recording for visual changes

PRs that touch `callAIProvider()`, `SYSTEM_PROMPT`, `lib/crypto.ts`, or any auth/database logic should clearly note what was tested.

---

## Bug Reports & Feature Requests

Open a GitHub Issue and include:

- **For bugs:** browser + version, which provider/model was active, steps to reproduce, and browser console output. For backend bugs, include any Vercel log output.
- **For features:** a clear description of the problem it solves and whether you're willing to implement it.

---

Questions? Open a Discussion on GitHub.
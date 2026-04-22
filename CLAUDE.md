# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

There is no local dev server — the app is a static frontend deployed to Vercel with serverless API functions. To work on it:

```bash
# Install dependencies
npm install

# Type-check the backend TypeScript (api/ and lib/)
npx tsc --noEmit

# Deploy (requires Vercel CLI)
vercel dev        # local dev with serverless functions
vercel deploy     # production deploy
```

There are no test scripts defined in `package.json`.

## Required Environment Variables

The backend will throw at import time if these are missing:

| Variable | How to generate |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (must be 64 hex chars = 32 bytes) |

## Architecture

**Frontend** (`index.html`, `script.js`, `styles.css`) — vanilla JS, Tailwind CSS, Marked.js. No build step; served as static files. All UI logic lives in `script.js`.

**Backend** (`api/`, `lib/`) — Vercel serverless functions in TypeScript. Each file under `api/` exports a default handler function. Routing is defined in `vercel.json`.

### Key frontend patterns in `script.js`

- **`state`** — single mutable object holding keys, models list, chats, folders, selectedModel, theme, etc.
- **`DOM`** — object of cached `getElementById` references; always use these instead of querying directly.
- **`LANG_ICONS`** — maps language identifier strings to Font Awesome class strings; used by `buildArtifactCard()` and the Marked renderer.
- **`SYSTEM_PROMPT`** — injected into every AI request; enforces that the model always wraps code in fenced blocks.
- **`parseMessageSegments()`** — splits AI response text into `{ type: 'text' | 'code', ... }` segments to separate prose from code blocks.
- **`finaliseStreamingBubble()`** — called when streaming completes; replaces raw streamed text with fully rendered markdown + artifact cards.
- **`buildArtifactCard()`** — creates an inline chat card UI element; clicking it calls `openArtifactPanel()`.
- Anthropic models are hardcoded in `ANTHROPIC_HARDCODED_MODELS` (no API model-list endpoint); all other providers fetch their model lists dynamically.
- `escapeHtml()` must be used for all user-controlled strings injected into `innerHTML`.

### Backend data flow

- `lib/db.ts` — singleton MongoDB connection (cached on `global._mongoose` to survive serverless warm restarts).
- `lib/crypto.ts` — AES-256-GCM encrypt/decrypt for provider API keys stored in MongoDB. Encrypted format: `hex(iv):hex(authTag):hex(ciphertext)`.
- `lib/authMiddleware.ts` — `requireAuth()` extracts and verifies Bearer token; returns `TokenPayload` or sends 401 and returns `null`.
- `lib/rateLimit.ts` — per-IP rate limiting backed by the `RateLimit` MongoDB collection (TTL-indexed); used on `/api/auth/login` and `/api/auth/register`.
- API keys are encrypted before saving (`api/data/save.ts`) and decrypted after loading (`api/data/load.ts`).

### Artifact panel

Code blocks in AI responses are rendered as artifact cards (inline) and optionally opened in a resizable side panel (`artifactPanel` state object). The panel supports a live Preview tab for `html` and `svg` content via a sandboxed `<iframe srcdoc>`.

### Common Workflows
- **Check for errors**: `npx tsc --noEmit`
- **Check environment**: `ls -a | grep .env` (to verify local config)
- **Log inspection**: `vercel logs`

### Notes
- Ignore node_modules in codebase; use the package-lock.json.
- Do a periodic web search on latest Anthropic models and update the Anthropic hard-coded models accordingly.

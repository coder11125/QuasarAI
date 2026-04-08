# ☄️ Quasar AI

<img width="1440" height="790" alt="Screenshot 2026-04-01 at 3 44 45 PM" src="https://github.com/user-attachments/assets/92c02ddc-d147-4d04-866d-828509890508" />


A sleek, modern, multi-provider AI chat interface. Connect to Google Gemini, OpenAI, Anthropic Claude, Groq, or OpenRouter — all from one beautiful interface with cross-device sync, persistent accounts, and a secure Node.js backend.

![License](https://img.shields.io/badge/license-GPL--3.0-green) ![Backend](https://img.shields.io/badge/backend-Node.js-green) ![DB](https://img.shields.io/badge/database-MongoDB-brightgreen) ![Lang](https://img.shields.io/badge/backend%20lang-TypeScript-blue) [![Deploy with Vercel](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/coder11125/QuasarAI)

---

## ✨ Features

### 🔐 **Accounts & Cross-Device Sync**
- **Authentication** — Register and sign in with email and password
- **JWT Sessions** — Secure token-based auth with 7-day sessions
- **Cross-Device Sync** — API keys, chat history, folders, and selected model sync across all your devices
- **MongoDB Persistence** — All data stored in the cloud, never lost on browser clear

### 🛡️ **Security**
- **Encrypted API Keys** — All provider API keys are encrypted with AES-256-GCM before being stored in MongoDB
- **Rate Limiting** — Login and registration endpoints are rate-limited per IP (10 attempts per 15 minutes) to prevent brute force attacks
- **Timing-Safe Login** — Prevents user enumeration via timing attacks
- **Input Sanitization** — All user-controlled values are escaped before being injected into the DOM
- **Graceful Session Expiry** — Expired tokens trigger a clean logout with a clear message rather than a silent failure

### 🤖 **Multi-Provider Support**
Seamlessly switch between leading AI providers without leaving the app:
- **Google Gemini** — Gemini 2.5 Pro, Flash, and more
- **OpenAI** — GPT-4o, GPT-4 Turbo, GPT-3.5-Turbo
- **Anthropic Claude** — Claude Sonnet, Haiku, Opus
- **Groq** — Fastest inference for Llama, Mixtral, and more
- **OpenRouter** — Access to 200+ models from a single API

### 💬 **Rich Chat Experience**
- **Full Markdown Rendering** — Code blocks with syntax highlighting, tables, lists, bold/italic, links
- **Image Attachments** — Upload images and leverage vision capabilities
- **Voice Input** — Hands-free messaging via Web Speech API
- **Persistent Chat History** — Synced to MongoDB per-chat, available on any device
- **Auto-expanding Textarea** — Input grows as you type
- **Message Copy** — One-click copy of any message
- **Edit & Regenerate** — Edit any sent message and resend, or regenerate any AI response
- **Keyboard Shortcuts** — Enter to send, Shift+Enter for new line
- **Smart Chat Naming** — First message automatically becomes the chat title
- **Code Blocks** — All models present code in a side panel with live Preview for HTML/SVG
- **OCR** — Extract text from images using vision-capable models

### 📁 **Chat Folders**
- **Create Folders** — Organise chats into colour-coded folders
- **8 Folder Colors** — Gray, blue, green, amber, red, purple, pink, and teal
- **Collapsible Sections** — Click any folder to collapse or expand it
- **Move Chats** — Hover over any chat and click the folder icon to assign or reassign it
- **New Chat in Folder** — Click the + button on a folder header to create a chat directly inside it
- **Rename & Recolor** — Rename folders or cycle through colors with one click
- **Safe Delete** — Deleting a folder moves its chats to Unfiled rather than deleting them
- **Synced** — Folders and chat assignments persist to MongoDB and sync across devices

### 🎨 **Beautiful, Responsive UI**
- **Glassmorphism Design** — Frosted glass panels with subtle backdrop blur
- **Light/Dark Mode** — Toggle anytime; respects system preferences on first visit
- **Mobile-Friendly** — Fully responsive sidebar, optimal touch experience
- **Smooth Animations** — Slide-in messages, toast notifications, hover effects

---

## 🚀 Getting Started

1. Open [Quasar AI](https://quasar-ai-two.vercel.app/)
2. **Create an account** — click **Create Account**, enter your email and password
3. **Add API Keys:**
   - Click **⚙️ Settings** → **API Management**
   - Paste your key for each provider and click **Connect**
   - Keys sync automatically across all your devices
4. **Start chatting!** Select a model from the top dropdown and begin

### API Key Sources
| Provider | Link | Notes |
|---|---|---|
| Google Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | Free tier available |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | Pay-as-you-go |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Pay-as-you-go |
| Groq | [console.groq.com](https://console.groq.com/keys) | Free tier, fastest inference |
| OpenRouter | [openrouter.ai](https://openrouter.ai/keys) | 200+ models |

---

## 📖 How to Use

### Basic Chat
1. Select a model from the dropdown at the top
2. Type your message and press **Enter** to send
3. Responses render with full Markdown support

### Image Analysis
1. Click the **📎 paperclip** icon in the input area
2. Select an image from your device
3. Type your question and send — AI will analyze it (vision-capable models only)

### OCR — Extract Text from Images
1. Click the **📄 document** icon in the input area
2. Select an image containing text
3. The AI extracts all text and shows it in a modal
4. Click **Insert into Chat** to paste it into your message

### Voice Input
1. Click the **🎤 microphone** icon
2. Speak your message
3. Click again to stop — your speech is transcribed into the input

### Manage Chats
- **Rename** — Hover over a chat in the sidebar, click ✏️
- **Delete** — Hover over a chat, click 🗑️
- **Move to folder** — Hover over a chat, click the 📁 folder icon
- **New Chat** — Click **+ New Chat**
- **Search** — Use the search bar in the sidebar to find past chats (searches across all folders)

### Folders
- **Create** — Click **New Folder** in the sidebar and enter a name
- **Collapse/Expand** — Click the folder header to toggle
- **New chat inside a folder** — Click the **+** icon on the folder header
- **Rename** — Hover the folder header, click ✏️
- **Change color** — Hover the folder header, click 🎨 to cycle through 8 colors
- **Delete** — Hover the folder header, click 🗑️ (chats are moved to Unfiled, not deleted)
- **Move a chat** — Hover any chat item, click the folder icon to open the folder picker

### Code & Artifacts
- All code responses appear as artifact cards in the chat
- Click **Open** to view code in the side panel
- HTML and SVG files have a **Preview** tab for live rendering

---

## 🏗 Architecture

```
/
├── index.html           # Frontend UI
├── script.js            # Frontend logic (vanilla JS)
├── styles.css           # Styles (Tailwind + custom CSS)
├── vercel.json          # Vercel routing config
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── CLAUDE.md            # Claude Code instructions
├── api/
│   ├── auth/
│   │   ├── register.ts  # POST /api/auth/register
│   │   ├── login.ts     # POST /api/auth/login
│   │   └── me.ts        # GET  /api/auth/me
│   ├── data/
│   │   ├── save.ts      # POST /api/data/save  (keys + selectedModel)
│   │   └── load.ts      # GET  /api/data/load  (keys + selectedModel)
│   ├── chats/
│   │   ├── list.ts      # GET    /api/chats/list
│   │   ├── save.ts      # POST   /api/chats/save
│   │   └── delete.ts    # DELETE /api/chats/delete
│   └── folders/
│       ├── list.ts      # GET    /api/folders/list
│       ├── save.ts      # POST   /api/folders/save  (upsert)
│       └── delete.ts    # DELETE /api/folders/delete
└── lib/
    ├── db.ts             # MongoDB connection
    ├── jwt.ts            # Token sign/verify
    ├── crypto.ts         # AES-256-GCM encrypt/decrypt
    ├── rateLimit.ts      # Per-IP rate limiting
    ├── authMiddleware.ts # requireAuth() helper
    └── models/
        ├── User.ts       # User schema
        ├── UserData.ts   # API keys + selectedModel schema
        ├── Chat.ts       # Per-chat schema (includes folderId)
        ├── Folder.ts     # Folder schema
        └── RateLimit.ts  # Rate limit tracking schema (TTL-indexed)
```

**Stack:**
- **Frontend** — Vanilla JS, Tailwind CSS, Marked.js
- **Backend** — Node.js serverless functions (Vercel), TypeScript
- **Database** — MongoDB Atlas (Mongoose)
- **Auth** — JWT (jsonwebtoken) + bcrypt
- **Hosting** — Vercel Hobby (free)

---

## 🛠 Self-Hosting

### Environment Variables
Add these in your Vercel project settings:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random string for signing tokens — `openssl rand -base64 48` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ENCRYPTION_KEY` | 32-byte hex string for encrypting API keys — `openssl rand -hex 32` |

### Deploy
1. Fork this repository
2. Import into [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy — Vercel handles everything automatically

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a branch** for your feature
3. **Make changes** and test thoroughly
4. **Commit** with clear messages
5. **Push** and open a **Pull Request**

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

### Areas for Contribution
- Bug fixes and optimizations
- New provider integrations
- UI/UX improvements
- Documentation improvements
- Feature suggestions

---

## 📋 Browser Requirements
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Web Speech API for voice input (optional, gracefully disabled if unavailable)
- HTTPS required for Web Speech API

---

## License

MIT License 2026 Quasar AI — Free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Marked.js](https://marked.js.org) — Markdown parsing
- [Font Awesome](https://fontawesome.com) — Icons
- [MongoDB Atlas](https://mongodb.com/atlas) — Database
- [Vercel](https://vercel.com) — Hosting

---

## 🌟 Show Your Support

If Quasar AI helps you:
- ⭐ Star this repository
- 📢 Share it with friends
- 🐛 Report bugs via Issues
- 💡 Suggest features via Discussions

---

**Quasar AI** — AI simplified. Synced everywhere.

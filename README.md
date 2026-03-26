# ☄️ Quasar AI

A sleek, modern, multi-provider AI chat interface that runs **entirely in your browser**. Connect to Google Gemini, OpenAI, Anthropic Claude, Groq, or OpenRouter—all from one beautiful, privacy-focused interface. No backend. No accounts. Just pure, local AI.

![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-active-brightgreen) ![Software licensing model](https://img.shields.io/badge/software licensing model-OSS-blue)


---

## ✨ Features

### 🤖 **Multi-Provider Support**
Seamlessly switch between leading AI providers without leaving the app:
- **Google Gemini** — Gemini 2.5 Pro, 2.0 Flash, 1.5 Pro, and more
- **OpenAI** — GPT-4, GPT-4 Turbo, GPT-3.5-Turbo
- **Anthropic Claude** — Claude 3.7 Sonnet, 3.5 Sonnet, 3.5 Haiku, 3 Opus
- **Groq** — Fastest inference for Llama, Mixtral, and more
- **OpenRouter** — Access to 200+ models from a single API

Switch between providers with one click. Use different models in different conversations.

### 🔒 **100% Privacy-First**
Your data never leaves your device:
- API keys stored **only** in browser localStorage (never sent to third parties)
- Chat history remains on your device
- Direct connections to official provider APIs—no proxy servers
- Works offline after initial load (for stored chats)
- GDPR-compliant by design

### 💬 **Rich Chat Experience**
- **Full Markdown Rendering** — Code blocks with syntax highlighting, tables, lists, bold/italic, links
- **Image Attachments** — Upload images and leverage vision capabilities (supported by most providers)
- **Voice Input** — Hands-free messaging via Web Speech API
- **Persistent Chat History** — All conversations saved locally; never lost between sessions
- **Auto-expanding Textarea** — Input grows as you type (max 48 lines)
- **Message Copy** — One-click copy of any message to clipboard
- **Keyboard Shortcuts** — Enter to send, Shift+Enter for new line
- **Smart Chat Naming** — First message automatically becomes chat title (editable)

### 🎨 **Beautiful, Responsive UI**
- **Glassmorphism Design** — Frosted glass panels with subtle backdrop blur
- **Gradient Backgrounds** — Smooth, modern color transitions
- **Light/Dark Mode** — Toggle anytime; respects system preferences on first visit
- **Mobile-Friendly** — Fully responsive sidebar, optimal touch experience
- **Smooth Animations** — Slide-in messages, toast notifications, hover effects
- **Dark Mode Smart Defaults** — Automatically enables dark mode at night (configurable)

### ⚡ **Developer-Friendly**
- **Zero Backend Required** — Pure client-side, no server needed
- **Drop-In Deployment** — Push to GitHub and it gets deployed by Vercel within 5 minutes
- **No Build Step** — Works as-is; uses CDN-hosted libraries
- **Open Source** — MIT license; fork and customize freely
- **Well-Organized Code** — Clear separation of concerns, easy to extend

---

## 🚀 Getting Started

1. Open [Quasar AI](https://quasar-ai-two.vercel.app/)

2. **Get API Keys (If not there already with you):**
   - [Google Gemini API](https://aistudio.google.com/app/apikey) — Free tier available, DeepMind models
   - [OpenAI API](https://platform.openai.com/api-keys) — Free tier available, GPT models
   - [Anthropic Claude API](https://console.anthropic.com/settings/keys) — Pay-as-you-go, state-of-the-art reasoning
   - [Groq API](https://console.groq.com/keys) — Free tier available, blazing fast inference
   - [OpenRouter](https://openrouter.ai/keys) — Access to 200+ models, pay-as-you-go or free tier

3. **Add API Keys in Settings:**
   - Open Quasar AI
   - Click **⚙️ Settings** (top right)
   - Go to **API Management** tab
   - Paste your API key for each provider
   - Click **Connect** to fetch available models

4. **Start chatting!** Select a model in the model selector in the top and begin a conversation.

---

## 📖 How to Use

### Basic Chat
1. **Select a model** from the dropdown (top)
2. **Type your message** in the input box
3. **Press Enter** to send (or click Send button)
4. **Responses appear** with full Markdown support

### Advanced Features

#### Image Analysis
1. Click the **📎 paperclip** icon in the input area
2. Select an image from your device
3. Type your question about the image
4. Send—AI will analyze it (if model supports vision)

#### Voice Input
1. Click the **🎤 microphone** icon
2. Speak your message
3. Release or click again to stop recording
4. Your speech is transcribed and added to the input

#### Manage Chats
- **Rename** — Hover over a chat in the sidebar, click the ✏️ pen icon
- **Delete** — Hover over a chat, click the 🗑️ trash icon
- **New Chat** — Click the **+ New Chat** button to start fresh
- **Switch** — Click any chat name to load that conversation

#### Export & Share
- **Copy Messages** — Hover over any message, click the 📋 copy button
- **Select All** — Manually copy your entire chat for backup

#### Customize
- **Theme** — Toggle Light/Dark mode in Settings → General
- **Model Parameters** — Swap models mid-conversation (Settings → API Management)
- **Clear All** — Nuke all chats in Settings → General (⚠️ irreversible)

---

## 🛠 Configuration

### Storage & Persistence
- Chat history: `localStorage['quasar_state']` (browser data only)
- Auto-saved on every message
- Survives browser restarts
- Clear manually in Settings or via browser DevTools

### API Rate Limits

See each provider's documentation for current limits.

### Browser Requirements
- Modern browser with ES6+ support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Web Speech API for voice input (optional; feature gracefully disabled if unavailable)
- localStorage enabled (required)
- HTTPS recommended (required for Web Speech API on most browsers)

---

## 🔐 Security & Privacy

### What You Store Locally
✅ API keys (encrypted in localStorage)  
✅ Chat messages  
✅ User preferences (theme, model selection)  

### What We DON'T Send Anywhere or Use
❌ API keys are never sent to us  
❌ Chat history never reaches our servers  
❌ No analytics, tracking, or telemetry  
❌ No third-party integrations  

### Best Practices
1. Use a separate API key for Quasar AI (avoid your main dev key)
2. Regenerate keys if they're accidentally exposed
3. Clear your browser data to remove chat history
4. Use on HTTPS-enabled devices when possible

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create a branch or edit existing** 
3. **Make changes** and test thoroughly
4. **Commit** with clear messages
5. **Push** and submit a **Pull Request**

### Areas for Contribution
- Bug fixes and optimizations
- New provider integrations
- UI/UX improvements
- Documentation and tutorials
- Feature ideas and feedback

---

## License

MIT License 2026 Quasar AI

Free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Marked.js](https://marked.js.org) — Markdown parsing
- [Font Awesome](https://fontawesome.com) — Icons
- Love for clean, privacy-first software

---

## 🌟 Show Your Support

If Quasar AI helps you, please:
- ⭐ Star this repository
- 📢 Share it with friends
- 🐛 Report bugs responsibly
- 💡 Suggest features

---

**Quasar AI** — AI simplified. Privacy preserved. Locally powered.

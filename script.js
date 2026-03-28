// --- 1. STATE & CONSTANTS ---
const ANTHROPIC_HARDCODED_MODELS = [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
];

const DEFAULT_PROVIDERS = {
    google: { name: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/models", link: "https://aistudio.google.com/app/apikey" },
    openai: { name: "OpenAI", url: "https://api.openai.com/v1/models", link: "https://platform.openai.com/api-keys" },
    anthropic: { name: "Anthropic", url: "hardcoded", link: "https://console.anthropic.com/settings/keys" },
    groq: { name: "Groq", url: "https://api.groq.com/openai/v1/models", link: "https://console.groq.com/keys" },
    openrouter: { name: "OpenRouter", url: "https://openrouter.ai/api/v1/models", link: "https://openrouter.ai/keys" }
};

const LANG_ICONS = {
    html: 'fab fa-html5', css: 'fab fa-css3-alt',
    javascript: 'fab fa-js-square', js: 'fab fa-js-square',
    typescript: 'fab fa-js-square', ts: 'fab fa-js-square',
    python: 'fab fa-python', py: 'fab fa-python',
    bash: 'fas fa-terminal', sh: 'fas fa-terminal', shell: 'fas fa-terminal',
    json: 'fas fa-code', sql: 'fas fa-database',
    java: 'fab fa-java', cpp: 'fas fa-code', c: 'fas fa-code',
    rust: 'fas fa-code', go: 'fas fa-code', php: 'fab fa-php',
    ruby: 'fas fa-gem', swift: 'fab fa-swift', kotlin: 'fas fa-code',
    markdown: 'fab fa-markdown', md: 'fab fa-markdown',
    xml: 'fas fa-code', yaml: 'fas fa-cog', yml: 'fas fa-cog',
};

const PREVIEWABLE_LANGS = ['html', 'svg'];

const SYSTEM_PROMPT = `You are Quasar AI, a helpful assistant. Follow these rules strictly:
1. ALWAYS wrap ALL code in fenced code blocks with the correct language tag. No exceptions.
   - Use \`\`\`html for HTML, \`\`\`python for Python, \`\`\`javascript for JS, \`\`\`css for CSS, etc.
   - Even single-line code snippets must use fenced code blocks, never inline backticks for code output.
   - If a response contains multiple languages, each block must be separately fenced with its own language tag.
2. Never output raw unwrapped code outside of a fenced block.
3. Be concise, clear, and helpful.`;

// --- MARKED CONFIGURATION ---
marked.use({
    gfm: true,        // GitHub Flavoured Markdown: tables, strikethrough, task lists
    breaks: false,    // Disable: single newlines were becoming <br> inside <p>, adding phantom height
    renderer: (() => {
        const r = new marked.Renderer();

        // Open all links in a new tab safely
        r.link = (href, title, text) =>
            `<a href="${href}" ${title ? `title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;

        // Paragraphs: strip any trailing <br> tags to prevent phantom bottom space
        r.paragraph = (text) =>
            `<p>${text.replace(/(<br\s*\/?>\s*)+$/, '')}</p>`;

        // Inline code — styled token, not a full artifact card
        r.codespan = (code) =>
            `<code class="inline-code">${code}</code>`;

        // Fenced code blocks inside prose get a styled pre/code
        // (These should have been stripped by parseMessageSegments already,
        //  but this handles any that slip through in pure-text segments)
        r.code = (code, lang) => {
            const safeLang = (lang || 'plaintext').toLowerCase();
            const icon = LANG_ICONS[safeLang] || 'fas fa-code';
            const label = safeLang === 'plaintext' ? 'Code' : safeLang.toUpperCase();
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="prose-code-block">
                    <div class="prose-code-header">
                        <span class="prose-code-lang"><i class="${icon}"></i> ${label}</span>
                        <button class="prose-code-copy" onclick="copyProseCode(this)" title="Copy">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <pre class="prose-code-pre"><code>${escaped}</code></pre>
                </div>`;
        };

        // Tables — add classes for styling
        r.table = (header, body) =>
            `<div class="prose-table-wrap"><table class="prose-table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

        // Blockquotes
        r.blockquote = (quote) =>
            `<blockquote class="prose-blockquote">${quote}</blockquote>`;

        return r;
    })()
});

// Copy button for prose code blocks
function copyProseCode(btn) {
    const code = btn.closest('.prose-code-block').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
    }).catch(() => showToast('Failed to copy'));
}

let state = {
    keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
    models: { google: [], openai: [], anthropic: [], groq: [], openrouter: [] },
    chats: {},
    currentChatId: null,
    selectedModel: '',
    theme: 'light',
    sidebarCollapsed: false,
    searchQuery: ''
};

let currentAttachment = null;

// Artifact panel state
let artifactPanel = {
    open: false,
    code: '',
    lang: '',
    activeTab: 'code',
    width: 45, // % of mainContent
};

const DOM = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sidebar: document.getElementById('sidebar'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
    closeSidebarBtnMobile: document.getElementById('closeSidebarBtnMobile'),
    chatList: document.getElementById('chatList'),
    emptySearchState: document.getElementById('emptySearchState'),
    chatSearchInput: document.getElementById('chatSearchInput'),
    chatWindow: document.getElementById('chatWindow'),
    currentChatTitle: document.getElementById('currentChatTitle'),
    chatForm: document.getElementById('chatForm'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    modelSelect: document.getElementById('modelSelect'),
    modelDropdownBtn: document.getElementById('modelDropdownBtn'),
    modelDropdownMenu: document.getElementById('modelDropdownMenu'),
    modelDropdownLabel: document.getElementById('modelDropdownLabel'),
    settingsModal: document.getElementById('settingsModal'),
    providerSettingsList: document.getElementById('providerSettingsList'),
    fileInput: document.getElementById('fileInput'),
    attachmentPreview: document.getElementById('attachmentPreview'),
    attachmentName: document.getElementById('attachmentName'),
    removeAttachmentBtn: document.getElementById('removeAttachmentBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    toastContainer: document.getElementById('toastContainer'),
    mainContent: document.getElementById('mainContent'),
    chatColumn: document.getElementById('chatColumn'),
    resizeHandle: document.getElementById('resizeHandle'),
    artifactPanelEl: document.getElementById('artifactPanel'),
    artifactPanelIcon: document.getElementById('artifactPanelIcon'),
    artifactPanelLang: document.getElementById('artifactPanelLang'),
    artifactPanelTabs: document.getElementById('artifactPanelTabs'),
    artifactPanelCodePane: document.getElementById('artifactPanelCodePane'),
    artifactPanelPreviewPane: document.getElementById('artifactPanelPreviewPane'),
    artifactPanelCode: document.getElementById('artifactPanelCode'),
    artifactPanelIframe: document.getElementById('artifactPanelIframe'),
    artifactPanelCopyBtn: document.getElementById('artifactPanelCopyBtn'),
};

// --- TOAST ---
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    const bgClass = type === 'error'
        ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        : 'bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300';
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full ${bgClass}`;
    toast.innerHTML = `
        <i class="fas ${iconClass} text-lg flex-shrink-0"></i>
        <p class="text-sm font-medium flex-grow">${message}</p>
        <button onclick="this.parentElement.remove()" class="text-current opacity-70 hover:opacity-100 p-1"><i class="fas fa-times"></i></button>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}


// --- CHAT SEARCH & FILTERING ---
function getSearchableText(chat) {
    const titleText = chat.title.toLowerCase();
    const firstMessageText = chat.messages.length > 0 
        ? chat.messages[0].text.toLowerCase().substring(0, 100)
        : '';
    return `${titleText} ${firstMessageText}`;
}

function filterChats(query) {
    state.searchQuery = query.toLowerCase();
    renderChatList();
}

// --- INIT ---
function init() {
    const saved = localStorage.getItem('quasar_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
    }
    if (state.theme === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
    if (window.innerWidth > 768 && state.sidebarCollapsed) {
        DOM.sidebar.classList.add('sidebar-collapsed');
    }
    renderProviderSettings();
    updateModelSelector();
    setupModelDropdown();
    setupResizeHandle();
    setupSearchInput();

    if (Object.keys(state.chats).length === 0) {
        createNewChat(false);
    } else {
        if (!state.currentChatId || !state.chats[state.currentChatId]) {
            state.currentChatId = Object.keys(state.chats).sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt)[0];
        }
        renderChatList();
        renderChat(state.currentChatId);
    }
    if (state.selectedModel) DOM.modelSelect.value = state.selectedModel;
    setupSpeechRecognition();

    // Check auth — shows login screen if not authenticated
    checkAuthOnLoad();
}

function saveState() {
    localStorage.setItem('quasar_state', JSON.stringify(state));
    // Debounced server sync — waits 2s after last change before saving
    clearTimeout(saveState._syncTimer);
    saveState._syncTimer = setTimeout(syncToServer, 2000);
}

// --- SERVER SYNC ---
async function syncToServer() {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch('/api/data/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                keys: state.keys,
                selectedModel: state.selectedModel,
                chats: state.chats,
            })
        });
    } catch (err) {
        console.warn('Failed to sync to server:', err);
    }
}

async function loadFromServer() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const res = await fetch('/api/data/load', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Merge server data into state — server wins over localStorage
        if (data.keys) state.keys = { ...state.keys, ...data.keys };
        if (data.selectedModel) state.selectedModel = data.selectedModel;
        if (data.chats && Object.keys(data.chats).length > 0) state.chats = data.chats;

        // Save merged state locally
        localStorage.setItem('quasar_state', JSON.stringify(state));

        // Re-render UI with loaded data
        updateModelSelector();
        renderProviderSettings();
        if (Object.keys(state.chats).length === 0) {
            createNewChat(false);
        } else {
            if (!state.currentChatId || !state.chats[state.currentChatId]) {
                state.currentChatId = Object.keys(state.chats).sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt)[0];
            }
            renderChatList();
            renderChat(state.currentChatId);
        }
        if (state.selectedModel) {
            DOM.modelSelect.value = state.selectedModel;
            const [pk, mid] = state.selectedModel.split('|');
            if (pk && mid) DOM.modelDropdownLabel.textContent = mid.split('/').pop();
        }
    } catch (err) {
        console.warn('Failed to load from server:', err);
    }
}


// --- THEME ---
function setTheme(theme) {
    state.theme = theme;
    if (theme === 'dark') DOM.html.classList.add('dark');
    else DOM.html.classList.remove('dark');
    saveState();
}
DOM.themeToggleBtn.onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

// --- SIDEBAR ---
DOM.toggleSidebarBtn.onclick = () => {
    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.add('sidebar-open-mobile');
        DOM.mobileOverlay.classList.remove('hidden');
    } else {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        DOM.sidebar.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
        saveState();
    }
};
function closeMobileSidebar() {
    DOM.sidebar.classList.remove('sidebar-open-mobile');
    DOM.mobileOverlay.classList.add('hidden');
}
DOM.closeSidebarBtnMobile.onclick = closeMobileSidebar;
DOM.mobileOverlay.onclick = closeMobileSidebar;

// --- SEARCH INPUT SETUP ---
function setupSearchInput() {
    DOM.chatSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        filterChats(query);
    });
}

// --- INPUT ---
DOM.userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 192) + 'px';
    validateInput();
});
function validateInput() {
    const hasText = DOM.userInput.value.trim().length > 0;
    const hasFile = !!currentAttachment;
    const hasModel = !!DOM.modelSelect.value;
    DOM.sendBtn.disabled = !((hasText || hasFile) && hasModel);
}
DOM.modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
    saveState();
    validateInput();
});

// =============================================
// ARTIFACT SIDE PANEL
// =============================================

function openArtifactPanel(code, lang) {
    artifactPanel.open = true;
    artifactPanel.code = code;
    artifactPanel.lang = lang;
    artifactPanel.activeTab = 'code';

    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);
    const icon = LANG_ICONS[lang] || 'fas fa-code';
    const langLabel = lang === 'plaintext' ? 'Code' : lang.toUpperCase();

    DOM.artifactPanelIcon.className = icon;
    DOM.artifactPanelLang.textContent = langLabel;

    // Tabs
    if (isPreviewable) {
        DOM.artifactPanelTabs.innerHTML = `
            <button class="artifact-tab active" onclick="switchPanelTab('code', this)">
                <i class="fas fa-code"></i> Code
            </button>
            <button class="artifact-tab" onclick="switchPanelTab('preview', this)">
                <i class="fas fa-eye"></i> Preview
            </button>
        `;
        DOM.artifactPanelTabs.classList.remove('hidden');
    } else {
        DOM.artifactPanelTabs.innerHTML = '';
        DOM.artifactPanelTabs.classList.add('hidden');
    }

    // Code
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    DOM.artifactPanelCode.innerHTML = escaped;
    DOM.artifactPanelCode.className = `artifact-code lang-${lang}`;

    // Reset panes
    DOM.artifactPanelCodePane.classList.remove('hidden');
    DOM.artifactPanelPreviewPane.classList.add('hidden');
    DOM.artifactPanelIframe.removeAttribute('srcdoc');
    DOM.artifactPanelIframe.removeAttribute('data-loaded');

    // Show panel
    DOM.artifactPanelEl.classList.remove('hidden');
    DOM.artifactPanelEl.classList.add('flex');
    DOM.resizeHandle.classList.remove('hidden');

    // Apply width
    applyPanelWidth(artifactPanel.width);

    requestAnimationFrame(() => {
        DOM.artifactPanelEl.classList.add('panel-open');
    });
}

function switchPanelTab(tab, btn) {
    DOM.artifactPanelTabs.querySelectorAll('.artifact-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    artifactPanel.activeTab = tab;

    if (tab === 'code') {
        DOM.artifactPanelCodePane.classList.remove('hidden');
        DOM.artifactPanelPreviewPane.classList.add('hidden');
    } else {
        DOM.artifactPanelCodePane.classList.add('hidden');
        DOM.artifactPanelPreviewPane.classList.remove('hidden');
        if (!DOM.artifactPanelIframe.dataset.loaded) {
            let html = artifactPanel.code;
            if (artifactPanel.lang === 'svg') {
                html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff">${artifactPanel.code}</body></html>`;
            }
            DOM.artifactPanelIframe.srcdoc = html;
            DOM.artifactPanelIframe.dataset.loaded = '1';
        }
    }
}

function copyArtifactPanel() {
    navigator.clipboard.writeText(artifactPanel.code).then(() => {
        DOM.artifactPanelCopyBtn.innerHTML = '<i class="fas fa-check"></i>';
        DOM.artifactPanelCopyBtn.classList.add('copied');
        setTimeout(() => {
            DOM.artifactPanelCopyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            DOM.artifactPanelCopyBtn.classList.remove('copied');
        }, 2000);
        showToast('Code copied!', 'success');
    }).catch(() => showToast('Failed to copy'));
}

function closeArtifactPanel() {
    DOM.artifactPanelEl.classList.remove('panel-open');
    setTimeout(() => {
        DOM.artifactPanelEl.classList.add('hidden');
        DOM.artifactPanelEl.classList.remove('flex');
        DOM.resizeHandle.classList.add('hidden');
        DOM.artifactPanelEl.style.width = '';
        artifactPanel.open = false;
    }, 220);
}

function applyPanelWidth(pct) {
    const totalW = DOM.mainContent.offsetWidth;
    const panelW = Math.round(totalW * pct / 100);
    DOM.artifactPanelEl.style.width = panelW + 'px';
    DOM.artifactPanelEl.style.flex = 'none';
}

// --- RESIZE HANDLE ---
function setupResizeHandle() {
    const handle = DOM.resizeHandle;
    let dragging = false;
    let startX = 0;
    let startPanelW = 0;

    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX;
        startPanelW = DOM.artifactPanelEl.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        DOM.artifactPanelIframe.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = startX - e.clientX;
        const totalW = DOM.mainContent.offsetWidth;
        const newW = Math.min(Math.max(startPanelW + dx, 300), totalW * 0.75);
        DOM.artifactPanelEl.style.width = newW + 'px';
        artifactPanel.width = (newW / totalW) * 100;
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        DOM.artifactPanelIframe.style.pointerEvents = '';
    });

    // Touch
    handle.addEventListener('touchstart', (e) => {
        dragging = true;
        startX = e.touches[0].clientX;
        startPanelW = DOM.artifactPanelEl.offsetWidth;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = startX - e.touches[0].clientX;
        const totalW = DOM.mainContent.offsetWidth;
        const newW = Math.min(Math.max(startPanelW + dx, 300), totalW * 0.75);
        DOM.artifactPanelEl.style.width = newW + 'px';
        artifactPanel.width = (newW / totalW) * 100;
    }, { passive: true });
    document.addEventListener('touchend', () => { dragging = false; });
}

// --- MODEL DROPDOWN ---
function setupModelDropdown() {
    if (!DOM.modelDropdownBtn || !DOM.modelDropdownMenu) return;
    DOM.modelDropdownBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.modelDropdownMenu.classList.toggle('hidden'); });
    document.addEventListener('click', () => { DOM.modelDropdownMenu.classList.add('hidden'); });
    DOM.modelDropdownMenu.addEventListener('click', (e) => { e.stopPropagation(); });
}

function selectModel(providerKey, modelId) {
    state.selectedModel = `${providerKey}|${modelId}`;
    DOM.modelDropdownLabel.textContent = modelId.split('/').pop();
    DOM.modelDropdownMenu.classList.add('hidden');
    if (DOM.modelSelect) DOM.modelSelect.value = state.selectedModel;
    DOM.modelDropdownMenu.querySelectorAll('.model-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-model-id') === state.selectedModel);
    });
    saveState();
    validateInput();
}

// --- CHAT MANAGEMENT ---
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function createNewChat(switchChat = true) {
    const id = generateId();
    state.chats[id] = { id, title: 'New Chat', messages: [], updatedAt: Date.now() };
    if (switchChat) {
        state.currentChatId = id;
        renderChat(id);
        closeArtifactPanel();
        if (window.innerWidth <= 768) closeMobileSidebar();
    }
    saveState();
    renderChatList();
}

function selectChat(id) {
    state.currentChatId = id;
    saveState();
    renderChat(id);
    renderChatList();
    if (window.innerWidth <= 768) closeMobileSidebar();
}

function deleteChat(id, event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
        delete state.chats[id];
        if (state.currentChatId === id) {
            const remaining = Object.keys(state.chats);
            if (remaining.length > 0) selectChat(remaining[0]);
            else createNewChat();
        } else { renderChatList(); saveState(); }
    }
}

function clearAllChats() {
    if (confirm('Are you sure you want to permanently delete ALL chats?')) {
        state.chats = {};
        createNewChat(true);
        closeSettings();
    }
}

function renameChat(id, event) {
    event.stopPropagation();
    const newName = prompt('Enter new chat name:', state.chats[id].title);
    if (newName && newName.trim()) {
        state.chats[id].title = newName.trim();
        saveState();
        renderChatList();
        if (state.currentChatId === id) DOM.currentChatTitle.textContent = newName.trim();
    }
}

function renderChatList() {
    const query = state.searchQuery;
    const allChats = Object.keys(state.chats).sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt);
    
    // Filter chats based on search query
    const filteredIds = query === ''
        ? allChats
        : allChats.filter(id => {
            const chat = state.chats[id];
            const searchableText = getSearchableText(chat);
            return searchableText.includes(query);
        });

    const fragment = document.createDocumentFragment();
    filteredIds.forEach(id => {
        const chat = state.chats[id];
        const isSelected = id === state.currentChatId;
        const div = document.createElement('div');
        div.className = `group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/5 text-brand-600 dark:text-brand-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 border border-transparent'}`;
        div.onclick = () => selectChat(id);
        div.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <i class="fas fa-message text-[12px] opacity-70"></i>
                <span class="truncate text-sm">${chat.title}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="renameChat('${id}', event)" class="p-1.5 text-slate-400 hover:text-brand-500 rounded bg-slate-50 dark:bg-slate-700/50"><i class="fas fa-pen text-[10px]"></i></button>
                <button onclick="deleteChat('${id}', event)" class="p-1.5 text-slate-400 hover:text-red-500 rounded bg-slate-50 dark:bg-slate-700/50"><i class="fas fa-trash text-[10px]"></i></button>
            </div>
        `;
        fragment.appendChild(div);
    });

    DOM.chatList.innerHTML = '';
    DOM.chatList.appendChild(fragment);

    // Show/hide empty state
    if (filteredIds.length === 0) {
        DOM.chatList.classList.add('hidden');
        DOM.emptySearchState.classList.remove('hidden');
    } else {
        DOM.chatList.classList.remove('hidden');
        DOM.emptySearchState.classList.add('hidden');
    }
}

function renderChat(id) {
    const chat = state.chats[id];
    DOM.currentChatTitle.textContent = chat.title;
    DOM.chatWindow.innerHTML = '';
    if (chat.messages.length === 0) {
        DOM.chatWindow.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div class="w-16 h-16 rounded-2xl bg-brand-500 mx-auto flex items-center justify-center text-white shadow-xl mb-6 text-3xl animate-pulse">
                    <i class="fas fa-meteor"></i>
                </div>
                <h2 class="text-2xl font-bold text-slate-800 dark:text-white">How can I help you today?</h2>
                <p class="mt-2 text-sm max-w-sm text-slate-500">Configure your API key in settings and select a model to start.</p>
            </div>
        `;
    } else {
        chat.messages.forEach(msg => appendMessageUI(msg.role, msg.text, msg.attachment));
    }
    scrollToBottom();
    validateInput();
}

function scrollToBottom() {
    DOM.chatWindow.scrollTo({ top: DOM.chatWindow.scrollHeight, behavior: 'smooth' });
}

// --- PARSE SEGMENTS ---
function parseMessageSegments(text) {
    const segments = [];
    const re = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0, match;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const tb = text.slice(lastIndex, match.index).trim();
            if (tb) segments.push({ type: 'text', content: tb });
        }
        segments.push({ type: 'code', lang: (match[1] || 'plaintext').toLowerCase(), content: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        const ta = text.slice(lastIndex).trim();
        if (ta) segments.push({ type: 'text', content: ta });
    }
    if (segments.length === 0) segments.push({ type: 'text', content: text });
    return segments;
}

// --- ARTIFACT CARD (inline in chat) ---
function buildArtifactCard(lang, code) {
    const cardId = 'card-' + generateId();
    const icon = LANG_ICONS[lang] || 'fas fa-code';
    const langLabel = lang === 'plaintext' ? 'Code' : lang.toUpperCase();
    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);
    const lineCount = code.trim().split('\n').length;

    const card = document.createElement('div');
    card.className = 'artifact-card';
    card.id = cardId;
    // Store data safely
    card._code = code;
    card._lang = lang;

    card.innerHTML = `
        <div class="artifact-card-left">
            <div class="artifact-card-icon-wrap">
                <i class="${icon}"></i>
            </div>
            <div class="artifact-card-info">
                <span class="artifact-card-title">${langLabel}</span>
                <span class="artifact-card-meta">${lineCount} line${lineCount !== 1 ? 's' : ''}${isPreviewable ? ' · Live preview' : ''}</span>
            </div>
        </div>
        <button class="artifact-card-btn" id="${cardId}-btn" title="Open in panel">
            <i class="fas fa-arrow-up-right-from-square"></i>
            <span>Open</span>
        </button>
    `;

    // Attach click after element exists
    card.querySelector(`#${cardId}-btn`).addEventListener('click', () => {
        openArtifactPanel(card._code, card._lang);
    });

    return card;
}

// --- MESSAGE UI ---
function appendMessageUI(role, text, attachment = null) {
    if (DOM.chatWindow.querySelector('.fa-meteor.animate-pulse')) {
        DOM.chatWindow.innerHTML = '';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in gap-2 group`;

    const bubble = document.createElement('div');

    if (role === 'user') {
        bubble.className = 'max-w-[90%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-sm message-user rounded-br-sm';
        if (attachment) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'mb-3 max-w-[250px] rounded-lg overflow-hidden border border-white/20';
            imgDiv.innerHTML = `<img src="${attachment.dataUrl}" alt="Attachment" class="w-full h-auto object-cover" loading="lazy">`;
            bubble.appendChild(imgDiv);
        }
        const textDiv = document.createElement('div');
        textDiv.className = 'whitespace-pre-wrap text-sm md:text-base leading-relaxed';
        textDiv.textContent = text;
        bubble.appendChild(textDiv);
    } else {
        bubble.className = 'max-w-[90%] md:max-w-[80%] rounded-2xl shadow-sm message-ai rounded-bl-sm overflow-hidden';
        const segments = parseMessageSegments(text);
        let firstItem = true;

        segments.forEach((seg, idx) => {
            const isLast = idx === segments.length - 1;
            if (seg.type === 'text' && seg.content.trim()) {
                const textDiv = document.createElement('div');
                textDiv.className = 'prose-msg';
                textDiv.style.cssText = `padding: ${firstItem ? '16px' : '4px'} 20px ${isLast ? '16px' : '4px'} 20px;`;
                try { textDiv.innerHTML = marked.parse(seg.content.trimEnd()); }
                catch (e) { textDiv.textContent = seg.content; }
                // Nuke any trailing <br> or empty <p> marked injected
                textDiv.querySelectorAll('p').forEach(p => {
                    p.innerHTML = p.innerHTML.replace(/(<br\s*\/?>\s*)+$/, '');
                    if (!p.innerHTML.trim()) p.remove();
                });
                bubble.appendChild(textDiv);
                firstItem = false;
            } else if (seg.type === 'code') {
                const card = buildArtifactCard(seg.lang, seg.content);
                const t = firstItem ? '12px' : '4px';
                const b = isLast ? '12px' : '4px';
                card.style.margin = `${t} 12px ${b} 12px`;
                bubble.appendChild(card);
                firstItem = false;
            }
        });
    }

    bubble.setAttribute('data-message-text', text);
    wrapper.appendChild(bubble);

    // Action buttons container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex flex-col items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
    copyBtn.title = 'Copy message';
    copyBtn.type = 'button';
    copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>';
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check text-sm text-emerald-500"></i>';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>'; }, 2000);
        }).catch(() => showToast('Failed to copy message'));
    };
    btnContainer.appendChild(copyBtn);

    // Edit button (user messages only)
    if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
        editBtn.title = 'Edit message';
        editBtn.type = 'button';
        editBtn.innerHTML = '<i class="fas fa-pen text-sm"></i>';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editMessage(wrapper, text, attachment);
        };
        btnContainer.appendChild(editBtn);
    }

    // Regenerate button (AI messages only)
    if (role === 'ai') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
        regenBtn.title = 'Regenerate response';
        regenBtn.type = 'button';
        regenBtn.innerHTML = '<i class="fas fa-rotate text-sm"></i>';
        regenBtn.onclick = (e) => {
            e.stopPropagation();
            regenerateResponse(wrapper);
        };
        btnContainer.appendChild(regenBtn);
    }
    
    wrapper.appendChild(btnContainer);
    DOM.chatWindow.appendChild(wrapper);

    clearTimeout(appendMessageUI.scrollTimeout);
    appendMessageUI.scrollTimeout = setTimeout(scrollToBottom, 0);
    return wrapper;
}

// --- SETTINGS ---
function openSettings(tabId = 'general') {
    switchTab(tabId);
    renderProviderSettings();
    DOM.settingsModal.classList.replace('hidden', 'flex');
}
function closeSettings() {
    DOM.settingsModal.classList.replace('flex', 'hidden');
}
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
    document.getElementById(`tab-content-${tabId}`).classList.remove('hidden');
}

function renderProviderSettings() {
    DOM.providerSettingsList.innerHTML = '';
    Object.keys(DEFAULT_PROVIDERS).forEach(provKey => {
        const info = DEFAULT_PROVIDERS[provKey];
        const currentKey = state.keys[provKey] || '';
        const hasModels = state.models[provKey] && state.models[provKey].length > 0;
        const div = document.createElement('div');
        div.className = "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-brand-500/30";
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i class="fas fa-microchip text-slate-400"></i> ${info.name}</h4>
                <div id="status-${provKey}" class="text-xs font-medium">
                    ${hasModels
                ? '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>'
                : '<span class="text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-white/5">Not Configured</span>'}
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 mt-1">
                <div class="relative flex-grow">
                    <input type="password" id="key-${provKey}" value="${currentKey}" placeholder="API Key" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 ring-brand-500 text-slate-800 dark:text-slate-200 transition-all font-mono">
                    <a href="${info.link}" target="_blank" class="absolute right-3 top-2.5 text-slate-400 hover:text-brand-500"><i class="fas fa-external-link-alt text-xs"></i></a>
                </div>
                <button onclick="saveAndFetch('${provKey}')" class="px-4 py-2 bg-slate-800 hover:bg-black dark:bg-brand-600 dark:hover:bg-brand-500 text-white text-sm rounded-lg font-medium transition-colors whitespace-nowrap shadow-sm flex items-center justify-center gap-2">
                    <i class="fas fa-link" id="sync-icon-${provKey}"></i> Connect
                </button>
            </div>
        `;
        DOM.providerSettingsList.appendChild(div);
    });
}

async function saveAndFetch(provider) {
    const input = document.getElementById(`key-${provider}`);
    const key = input.value.trim();
    const icon = document.getElementById(`sync-icon-${provider}`);
    const statusDiv = document.getElementById(`status-${provider}`);
    if (!key) { showToast(`Please enter an API key for ${DEFAULT_PROVIDERS[provider].name}.`); return; }
    state.keys[provider] = key;
    icon.className = 'fas fa-spinner fa-spin';

    if (provider === 'anthropic') {
        setTimeout(() => {
            state.models[provider] = ANTHROPIC_HARDCODED_MODELS;
            saveState(); updateModelSelector();
            icon.className = 'fas fa-link';
            statusDiv.innerHTML = '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>';
            showToast('Successfully connected to Anthropic.', 'success');
        }, 400);
        return;
    }

    try {
        let models = [];
        const url = DEFAULT_PROVIDERS[provider].url;
        if (provider === 'google') {
            const res = await fetch(`${url}?key=${key}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).map(m => m.name.replace('models/', ''));
        } else {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` } });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            models = data.data.map(m => m.id);
        }
        state.models[provider] = models.sort();
        saveState(); updateModelSelector();
        statusDiv.innerHTML = '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>';
        showToast(`Successfully connected to ${DEFAULT_PROVIDERS[provider].name}.`, 'success');
    } catch (err) {
        showToast(`Error connecting to ${provider}: ${err.message}`);
        statusDiv.innerHTML = '<span class="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800"><i class="fas fa-exclamation-circle mr-1"></i> Error</span>';
    } finally {
        icon.className = 'fas fa-link';
    }
}

function updateModelSelector() {
    if (!DOM.modelDropdownMenu || !DOM.modelSelect) return;
    DOM.modelSelect.innerHTML = '';
    let hasModels = false;
    const fragment = document.createDocumentFragment();
    Object.keys(state.models).forEach((provKey) => {
        const provModels = state.models[provKey];
        if (provModels && provModels.length > 0) {
            hasModels = true;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'model-provider-group';
            const providerLabel = document.createElement('div');
            providerLabel.className = 'model-provider-name';
            providerLabel.innerHTML = `<i class="fas fa-microchip mr-2 opacity-50"></i>${DEFAULT_PROVIDERS[provKey].name}`;
            groupDiv.appendChild(providerLabel);
            provModels.forEach((m) => {
                const modelFullId = `${provKey}|${m}`;
                const modelShortName = m.split('/').pop();
                const modelBtn = document.createElement('button');
                modelBtn.type = 'button';
                modelBtn.className = 'model-item';
                modelBtn.setAttribute('data-model-id', modelFullId);
                if (state.selectedModel === modelFullId) {
                    modelBtn.classList.add('active');
                    DOM.modelDropdownLabel.textContent = modelShortName;
                }
                modelBtn.innerHTML = `<span class="model-name-text">${modelShortName}</span><i class="fas fa-check selected-icon ml-auto opacity-0"></i>`;
                modelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); selectModel(provKey, m); };
                groupDiv.appendChild(modelBtn);
                const option = document.createElement('option');
                option.value = modelFullId; option.textContent = m;
                DOM.modelSelect.appendChild(option);
            });
            fragment.appendChild(groupDiv);
        }
    });
    DOM.modelDropdownMenu.innerHTML = '';
    if (hasModels) DOM.modelDropdownMenu.appendChild(fragment);
    else DOM.modelDropdownMenu.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No models available. Connect an API in Settings.</div>';

    if (!hasModels) DOM.modelDropdownLabel.textContent = 'Setup API in Settings';
    else if (!state.selectedModel) {
        const firstProv = Object.keys(state.models).find(k => state.models[k].length > 0);
        if (firstProv) selectModel(firstProv, state.models[firstProv][0]);
    } else {
        const [pk, mid] = state.selectedModel.split('|');
        DOM.modelDropdownLabel.textContent = mid.split('/').pop();
    }
    validateInput();
}

// --- FILE & VOICE ---
DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        currentAttachment = { dataUrl: event.target.result, type: file.type, name: file.name };
        DOM.attachmentName.textContent = file.name;
        DOM.attachmentPreview.classList.remove('hidden');
        validateInput();
    };
    reader.readAsDataURL(file);
});
DOM.removeAttachmentBtn.onclick = () => {
    currentAttachment = null; DOM.fileInput.value = '';
    DOM.attachmentPreview.classList.add('hidden'); validateInput();
};

function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { DOM.voiceBtn.style.display = 'none'; return; }
    const recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true;
    recognition.lang = 'en-US'; recognition.maxAlternatives = 1;
    let isRecording = false;
    recognition.onstart = () => { isRecording = true; DOM.voiceBtn.classList.add('text-red-500', 'animate-pulse'); showToast('🎤 Listening...', 'success'); };
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) DOM.userInput.value += (DOM.userInput.value ? ' ' : '') + event.results[i][0].transcript;
        }
        validateInput(); DOM.userInput.dispatchEvent(new Event('input'));
    };
    recognition.onerror = (event) => {
        const msgs = { 'no-speech': '❌ No speech detected.', 'audio-capture': '❌ No microphone found.', 'network': '❌ Network error.', 'not-allowed': '❌ Microphone denied.' };
        showToast(msgs[event.error] || `❌ Error: ${event.error}`); stopRec();
    };
    recognition.onend = () => stopRec();
    function stopRec() { isRecording = false; DOM.voiceBtn.classList.remove('text-red-500', 'animate-pulse'); }
    DOM.voiceBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isRecording) recognition.stop();
        else { try { recognition.start(); } catch (err) { showToast('❌ Failed to start microphone'); } }
    };
}

// --- SEND & API ---
DOM.chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = DOM.userInput.value.trim();
    const selected = state.selectedModel;
    if ((!text && !currentAttachment) || !selected) return;

    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) { showToast(`API Key missing for ${provider}. Please configure in Settings.`); openSettings('api'); return; }

    const userMsg = { role: 'user', text, attachment: currentAttachment };
    state.chats[state.currentChatId].messages.push(userMsg);
    state.chats[state.currentChatId].updatedAt = Date.now();

    if (state.chats[state.currentChatId].title === 'New Chat' && text) {
        state.chats[state.currentChatId].title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        renderChatList();
    }

    appendMessageUI('user', text, currentAttachment);
    DOM.userInput.value = ''; DOM.userInput.style.height = 'auto';
    DOM.removeAttachmentBtn.click();

    const thinkingWrapper = document.createElement('div');
    thinkingWrapper.className = 'flex w-full justify-start animate-slide-in gap-2';
    thinkingWrapper.innerHTML = `
        <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
            <span class="flex items-center gap-2 text-sm text-slate-500">
                <i class="fas fa-circle-notch fa-spin text-brand-500"></i> Thinking...
            </span>
        </div>`;
    DOM.chatWindow.appendChild(thinkingWrapper);
    scrollToBottom();

    try {
        const history = state.chats[state.currentChatId].messages.slice(-12);
        const responseText = await callAIProvider(provider, modelId, apiKey, history);
        thinkingWrapper.remove();
        appendMessageUI('ai', responseText);
        state.chats[state.currentChatId].messages.push({ role: 'ai', text: responseText });
        state.chats[state.currentChatId].updatedAt = Date.now();
        saveState(); renderChatList();
    } catch (err) {
        thinkingWrapper.innerHTML = `
            <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
                <div class="text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${err.message}</div>
            </div>`;
    }
};

DOM.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!DOM.sendBtn.disabled) DOM.chatForm.dispatchEvent(new Event('submit')); }
});

async function callAIProvider(provider, modelId, apiKey, messagesHistory) {
    let url, headers = {}, body = {};

    if (provider === 'google') {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        headers['Content-Type'] = 'application/json';
        body.systemInstruction = { parts: [{ text: SYSTEM_PROMPT }] };
        body.contents = messagesHistory.map(msg => {
            let parts = [];
            if (msg.text) parts.push({ text: msg.text });
            if (msg.attachment) { const b64 = msg.attachment.dataUrl.split(',')[1]; parts.push({ inlineData: { mimeType: msg.attachment.type, data: b64 } }); }
            return { role: msg.role === 'ai' ? 'model' : 'user', parts };
        });
    } else if (provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' };
        const msgs = [];
        for (const msg of messagesHistory) {
            let content = [];
            if (msg.text) content.push({ type: 'text', text: msg.text });
            if (msg.attachment && msg.role === 'user') { const b64 = msg.attachment.dataUrl.split(',')[1]; content.push({ type: 'image', source: { type: 'base64', media_type: msg.attachment.type, data: b64 } }); }
            msgs.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content });
        }
        body = { model: modelId, max_tokens: 4096, system: SYSTEM_PROMPT, messages: msgs };
    } else {
        if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if (provider === 'openrouter') { headers['HTTP-Referer'] = window.location.href; headers['X-Title'] = 'Quasar AI'; }
        const openAiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messagesHistory.map(msg => {
                const r = msg.role === 'ai' ? 'assistant' : 'user';
                if (msg.attachment && r === 'user') return { role: r, content: [{ type: 'text', text: msg.text || "Describe this image." }, { type: 'image_url', image_url: { url: msg.attachment.dataUrl } }] };
                return { role: r, content: msg.text };
            })
        ];
        body = { model: modelId, messages: openAiMessages };
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || data.error?.type || JSON.stringify(data));
    if (provider === 'google') return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    else if (provider === 'anthropic') return data.content?.[0]?.text || "No response.";
    else return data.choices?.[0]?.message?.content || "No response.";
}

// --- EDIT MESSAGE ---
function editMessage(messageWrapper, originalText, originalAttachment) {
    const messageBubble = messageWrapper.querySelector('.message-user');
    const messageIndex = Array.from(DOM.chatWindow.children).indexOf(messageWrapper);
    
    // Save original HTML for cancel
    const originalHTML = messageBubble.innerHTML;
    
    // Create edit form
    messageBubble.innerHTML = '';
    messageBubble.className = 'max-w-[90%] md:max-w-[75%] p-4 rounded-2xl shadow-sm message-user rounded-br-sm';
    
    const editForm = document.createElement('div');
    editForm.className = 'space-y-3';
    
    // Textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 outline-none focus:border-white/40 resize-none';
    textarea.value = originalText;
    textarea.rows = 3;
    textarea.style.minHeight = '80px';
    
    // Auto-resize textarea
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });
    
    // Attachment display (if exists)
    let attachmentPreview = null;
    if (originalAttachment) {
        attachmentPreview = document.createElement('div');
        attachmentPreview.className = 'flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-2 rounded-lg';
        attachmentPreview.innerHTML = `
            <i class="fas fa-image text-white/70 text-sm"></i>
            <span class="text-xs text-white/80 truncate flex-1">${originalAttachment.name}</span>
            <span class="text-xs text-white/50">(unchanged)</span>
        `;
        editForm.appendChild(attachmentPreview);
    }
    
    editForm.appendChild(textarea);
    
    // Buttons
    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex gap-2 justify-end';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        messageBubble.innerHTML = originalHTML;
    };
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'px-4 py-2 bg-white hover:bg-white/90 text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2';
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Save & Resend';
    saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (!newText) {
            showToast('Message cannot be empty');
            return;
        }
        
        // Update message in state
        const chat = state.chats[state.currentChatId];
        const stateMessageIndex = chat.messages.findIndex((msg, idx) => {
            // Find the user message at this position
            let uiIndex = 0;
            for (let i = 0; i <= idx; i++) {
                if (i === idx) return uiIndex === messageIndex;
                uiIndex++;
            }
            return false;
        });
        
        // Find actual index by counting messages
        let userMsgCount = 0;
        let actualIndex = -1;
        for (let i = 0; i < chat.messages.length; i++) {
            if (chat.messages[i].role === 'user' || chat.messages[i].role === 'ai') {
                if (userMsgCount === messageIndex) {
                    actualIndex = i;
                    break;
                }
                userMsgCount++;
            }
        }
        
        if (actualIndex === -1) {
            showToast('Error finding message');
            return;
        }
        
        // Update the message
        chat.messages[actualIndex].text = newText;
        
        // Remove all messages after this one (since we're re-sending)
        chat.messages = chat.messages.slice(0, actualIndex + 1);
        
        // Save state
        saveState();
        
        // Re-render chat to show updated message
        renderChat(state.currentChatId);
        
        // Automatically resend to get new AI response
        const selected = state.selectedModel;
        if (!selected) {
            showToast('Please select a model');
            return;
        }
        
        const [provider, modelId] = selected.split('|');
        const apiKey = state.keys[provider];
        if (!apiKey) {
            showToast(`API Key missing for ${provider}`);
            return;
        }
        
        // Add thinking indicator
        const thinkingWrapper = document.createElement('div');
        thinkingWrapper.className = 'flex w-full justify-start animate-slide-in gap-2';
        thinkingWrapper.innerHTML = `
            <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
                <span class="flex items-center gap-2 text-sm text-slate-500">
                    <i class="fas fa-circle-notch fa-spin text-brand-500"></i> Thinking...
                </span>
            </div>`;
        DOM.chatWindow.appendChild(thinkingWrapper);
        scrollToBottom();
        
        try {
            const history = chat.messages.slice(-12);
            const responseText = await callAIProvider(provider, modelId, apiKey, history);
            thinkingWrapper.remove();
            appendMessageUI('ai', responseText);
            chat.messages.push({ role: 'ai', text: responseText });
            chat.updatedAt = Date.now();
            saveState();
            renderChatList();
        } catch (err) {
            thinkingWrapper.innerHTML = `
                <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
                    <div class="text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${err.message}</div>
                </div>`;
        }
    };
    
    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    editForm.appendChild(btnGroup);
    
    messageBubble.appendChild(editForm);
    textarea.focus();
    textarea.style.height = textarea.scrollHeight + 'px';
}

// --- REGENERATE RESPONSE ---
async function regenerateResponse(aiMessageWrapper) {
    const messageIndex = Array.from(DOM.chatWindow.children).indexOf(aiMessageWrapper);
    const chat = state.chats[state.currentChatId];
    
    // Find the corresponding message in state
    let msgCount = 0;
    let actualIndex = -1;
    for (let i = 0; i < chat.messages.length; i++) {
        if (msgCount === messageIndex) {
            actualIndex = i;
            break;
        }
        msgCount++;
    }
    
    if (actualIndex === -1 || chat.messages[actualIndex].role !== 'ai') {
        showToast('Error: Could not find AI message');
        return;
    }
    
    // Check if we have a model selected
    const selected = state.selectedModel;
    if (!selected) {
        showToast('Please select a model');
        return;
    }
    
    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) {
        showToast(`API Key missing for ${provider}`);
        openSettings('api');
        return;
    }
    
    // Replace the AI message with a thinking indicator
    aiMessageWrapper.innerHTML = `
        <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
            <span class="flex items-center gap-2 text-sm text-slate-500">
                <i class="fas fa-circle-notch fa-spin text-brand-500"></i> Regenerating...
            </span>
        </div>`;
    
    try {
        // Get conversation history up to (but not including) this message
        const history = chat.messages.slice(0, actualIndex);
        const responseText = await callAIProvider(provider, modelId, apiKey, history);
        
        // Update state
        chat.messages[actualIndex].text = responseText;
        chat.updatedAt = Date.now();
        saveState();
        
        // Re-render the entire chat to show updated message
        renderChat(state.currentChatId);
        renderChatList();
        
    } catch (err) {
        aiMessageWrapper.innerHTML = `
            <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
                <div class="text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${err.message}</div>
            </div>`;
    }
}

// =============================================
// OCR FEATURE
// =============================================

const ocrDOM = {
    get btn()          { return document.getElementById('ocrBtn'); },
    get fileInput()    { return document.getElementById('ocrFileInput'); },
    get modal()        { return document.getElementById('ocrModal'); },
    get loading()      { return document.getElementById('ocrLoading'); },
    get content()      { return document.getElementById('ocrContent'); },
    get errorEl()      { return document.getElementById('ocrError'); },
    get errorMsg()     { return document.getElementById('ocrErrorMsg'); },
    get previewImg()   { return document.getElementById('ocrPreviewImg'); },
    get resultText()   { return document.getElementById('ocrResultText'); },
    get insertBtn()    { return document.getElementById('ocrInsertBtn'); },
};

function openOcrModal() {
    ocrDOM.modal.classList.replace('hidden', 'flex');
}

function closeOcrModal() {
    ocrDOM.modal.classList.replace('flex', 'hidden');
    // Reset all states
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.insertBtn.classList.add('hidden');
    ocrDOM.previewImg.src = '';
    ocrDOM.resultText.value = '';
    ocrDOM.fileInput.value = '';
}

function insertOcrText() {
    const text = ocrDOM.resultText.value.trim();
    if (!text) return;
    const input = DOM.userInput;
    const existing = input.value;
    input.value = existing ? existing + '\n\n' + text : text;
    input.dispatchEvent(new Event('input'));
    input.focus();
    closeOcrModal();
    showToast('Text inserted into chat!', 'success');
}

function showOcrLoading(dataUrl) {
    ocrDOM.loading.classList.remove('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.insertBtn.classList.add('hidden');
    ocrDOM.previewImg.src = dataUrl;
}

function showOcrResult(text) {
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.content.classList.remove('hidden');
    ocrDOM.content.style.display = 'flex';
    ocrDOM.resultText.value = text;
    ocrDOM.insertBtn.classList.remove('hidden');
}

function showOcrError(message) {
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.remove('hidden');
    ocrDOM.errorEl.style.display = 'flex';
    ocrDOM.errorMsg.textContent = message;
}

async function runOcr(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        openOcrModal();
        showOcrLoading(dataUrl);

        const selected = state.selectedModel;
        if (!selected) {
            showOcrError('No model selected. Please choose a model first.');
            return;
        }

        const [provider, modelId] = selected.split('|');
        const apiKey = state.keys[provider];
        if (!apiKey) {
            showOcrError(`API key missing for ${DEFAULT_PROVIDERS[provider]?.name || provider}. Configure it in Settings.`);
            return;
        }

        const ocrPrompt = 'Please extract ALL text from this image exactly as it appears, preserving the original formatting, line breaks, and layout as much as possible. Output only the extracted text with no commentary or explanation.';
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/png';

        // For Groq, only a small set of models support vision — everything else is text-only
        if (provider === 'groq') {
            const GROQ_VISION_MODELS = ['llava', 'vision'];
            const supportsVision = GROQ_VISION_MODELS.some(v => modelId.toLowerCase().includes(v));
            if (!supportsVision) {
                showOcrError(`Groq model "${modelId.split('/').pop()}" is text-only and does not support image input. Please switch to a vision-capable model such as claude-3-5-sonnet, gpt-4o, or gemini-1.5-pro.`);
                return;
            }
        }
        // General blocklist for obviously non-vision models on other providers
        const NON_VISION_PATTERNS = [/whisper/i, /tts/i, /embedding/i, /davinci/i, /babbage/i, /curie/i, /ada/i];
        if (NON_VISION_PATTERNS.some(p => p.test(modelId))) {
            showOcrError(`The selected model "${modelId.split('/').pop()}" does not support image input. Please switch to a vision-capable model (e.g. claude-3-5-sonnet, gpt-4o, gemini-1.5-pro) and try again.`);
            return;
        }

        try {
            let extractedText = '';

            if (provider === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        max_tokens: 4096,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                                { type: 'text', text: ocrPrompt }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.content?.[0]?.text || '';

            } else if (provider === 'google') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType, data: base64 } },
                                { text: ocrPrompt }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            } else {
                // OpenAI-compatible (openai, groq, openrouter)
                let url = '';
                if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
                else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
                else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
                const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
                if (provider === 'openrouter') { headers['HTTP-Referer'] = window.location.href; headers['X-Title'] = 'Quasar AI'; }
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: ocrPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.choices?.[0]?.message?.content || '';
            }

            if (!extractedText.trim()) {
                showOcrResult('(No text detected in this image)');
            } else {
                showOcrResult(extractedText);
            }

        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('content must be a string') || msg.includes('does not support') || msg.includes('multimodal')) {
                showOcrError("The selected model '" + modelId.split('/').pop() + "' does not support image input. Please switch to a vision-capable model (e.g. claude-3-5-sonnet, gpt-4o, gemini-1.5-pro).");
            } else {
                showOcrError('OCR failed: ' + msg);
            }
        }
    };
    reader.readAsDataURL(file);
}

// Wire up OCR button and file input
document.getElementById('ocrBtn').addEventListener('click', () => {
    document.getElementById('ocrFileInput').click();
});
document.getElementById('ocrFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) runOcr(file);
});

// Close OCR modal on backdrop click
document.getElementById('ocrModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('ocrModal')) closeOcrModal();
});

// =============================================
// AUTH
// =============================================

const AUTH_TOKEN_KEY = 'quasar_auth_token';
const AUTH_USER_KEY  = 'quasar_auth_user';

function getAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getAuthUser()  {
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; }
}
function saveAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('auth-hidden');
}
function hideAuthScreen() {
    document.getElementById('authScreen').classList.add('auth-hidden');
    loadFromServer();
}

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('authLoginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('authRegisterForm').classList.toggle('hidden', isLogin);
    document.getElementById('authTabLoginBtn').className =
        `auth-tab-btn flex-1 py-3.5 text-sm font-semibold transition-all border-b-2 ${isLogin ? 'text-brand-500 border-brand-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`;
    document.getElementById('authTabRegisterBtn').className =
        `auth-tab-btn flex-1 py-3.5 text-sm font-semibold transition-all border-b-2 ${!isLogin ? 'text-brand-500 border-brand-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`;
    clearAuthError();
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    document.getElementById('authErrorMsg').textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('flex');
}
function clearAuthError() {
    const el = document.getElementById('authError');
    el.classList.add('hidden');
    el.classList.remove('flex');
}

function setAuthBtnLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Please wait…';
    } else {
        btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? '<i class="fas fa-eye-slash text-sm"></i>' : '<i class="fas fa-eye text-sm"></i>';
}

async function handleLogin() {
    clearAuthError();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) { showAuthError('Please enter your email and password.'); return; }

    setAuthBtnLoading('loginBtn', true);
    try {
        const res  = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error || 'Login failed.'); return; }

        saveAuthSession(data.token, data.user);
        hideAuthScreen();
        showToast(`Welcome back, ${data.user.email}!`, 'success');
    } catch (err) {
        showAuthError('Could not connect to server. Please try again.');
    } finally {
        setAuthBtnLoading('loginBtn', false);
    }
}

async function handleRegister() {
    clearAuthError();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm  = document.getElementById('registerConfirm').value;

    if (!email || !password) { showAuthError('Please fill in all fields.'); return; }
    if (password !== confirm) { showAuthError('Passwords do not match.'); return; }
    if (password.length < 8)  { showAuthError('Password must be at least 8 characters.'); return; }

    setAuthBtnLoading('registerBtn', true);
    try {
        const res  = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error || 'Registration failed.'); return; }

        saveAuthSession(data.token, data.user);
        hideAuthScreen();
        showToast(`Account created! Welcome, ${data.user.email}!`, 'success');
    } catch (err) {
        showAuthError('Could not connect to server. Please try again.');
    } finally {
        setAuthBtnLoading('registerBtn', false);
    }
}

function handleLogout() {
    if (!confirm('Sign out of Quasar AI?')) return;
    clearAuthSession();
    // Clear local state so next login loads fresh from server
    localStorage.removeItem('quasar_state');
    state.keys = { google: '', openai: '', anthropic: '', groq: '', openrouter: '' };
    state.models = { google: [], openai: [], anthropic: [], groq: [], openrouter: [] };
    state.chats = {};
    state.currentChatId = null;
    state.selectedModel = '';
    showAuthScreen();
    document.getElementById('loginEmail').value    = '';
    document.getElementById('loginPassword').value = '';
    switchAuthTab('login');
    showToast('Signed out successfully.', 'success');
}

async function checkAuthOnLoad() {
    const token = getAuthToken();
    if (!token) { showAuthScreen(); return; }

    // Verify token is still valid against the server
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            hideAuthScreen(); // Token valid — let user straight in
        } else {
            clearAuthSession();
            showAuthScreen();
        }
    } catch {
        // Network error — if token exists trust it locally rather than locking user out
        hideAuthScreen();
    }
}

// Enter key support on auth forms
document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});
document.getElementById('registerConfirm').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
});

init();
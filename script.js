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

// Language icons map
const LANG_ICONS = {
    html: 'fab fa-html5',
    css: 'fab fa-css3-alt',
    javascript: 'fab fa-js-square',
    js: 'fab fa-js-square',
    typescript: 'fab fa-js-square',
    ts: 'fab fa-js-square',
    python: 'fab fa-python',
    py: 'fab fa-python',
    bash: 'fas fa-terminal',
    sh: 'fas fa-terminal',
    shell: 'fas fa-terminal',
    json: 'fas fa-code',
    sql: 'fas fa-database',
    java: 'fab fa-java',
    cpp: 'fas fa-code',
    c: 'fas fa-code',
    rust: 'fas fa-code',
    go: 'fas fa-code',
    php: 'fab fa-php',
    ruby: 'fas fa-gem',
    swift: 'fab fa-swift',
    kotlin: 'fas fa-code',
    markdown: 'fab fa-markdown',
    md: 'fab fa-markdown',
    xml: 'fas fa-code',
    yaml: 'fas fa-cog',
    yml: 'fas fa-cog',
};

// Languages that support live preview
const PREVIEWABLE_LANGS = ['html', 'svg'];

const SYSTEM_PROMPT = `You are Quasar AI, a helpful assistant. Follow these rules strictly:
1. ALWAYS wrap ALL code in fenced code blocks with the correct language tag. No exceptions.
   - Use \`\`\`html for HTML, \`\`\`python for Python, \`\`\`javascript for JS, \`\`\`css for CSS, etc.
   - Even single-line code snippets must use fenced code blocks, never inline backticks for code output.
   - If a response contains multiple languages, each block must be separately fenced with its own language tag.
2. Never output raw unwrapped code outside of a fenced block.
3. Be concise, clear, and helpful.`;

let state = {
    keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
    models: { google: [], openai: [], anthropic: [], groq: [], openrouter: [] },
    chats: {},
    currentChatId: null,
    selectedModel: '',
    theme: 'light',
    sidebarCollapsed: false
};

let currentAttachment = null;

// DOM Elements
const DOM = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sidebar: document.getElementById('sidebar'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
    closeSidebarBtnMobile: document.getElementById('closeSidebarBtnMobile'),
    chatList: document.getElementById('chatList'),
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
    toastContainer: document.getElementById('toastContainer')
};

// Custom Toast UI implementation
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300';
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full ${bgClass}`;
    toast.innerHTML = `
        <i class="fas ${iconClass} text-lg flex-shrink-0"></i>
        <p class="text-sm font-medium flex-grow">${message}</p>
        <button onclick="this.parentElement.remove()" class="text-current opacity-70 hover:opacity-100 p-1">
            <i class="fas fa-times"></i>
        </button>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}

// --- 2. INITIALIZATION & STORAGE ---
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

    if(window.innerWidth > 768 && state.sidebarCollapsed) {
        DOM.sidebar.classList.add('sidebar-collapsed');
    }

    renderProviderSettings();
    updateModelSelector();
    setupModelDropdown();
    
    if (Object.keys(state.chats).length === 0) {
        createNewChat(false);
    } else {
        if (!state.currentChatId || !state.chats[state.currentChatId]) {
            state.currentChatId = Object.keys(state.chats).sort((a,b) => state.chats[b].updatedAt - state.chats[a].updatedAt)[0];
        }
        renderChatList();
        renderChat(state.currentChatId);
    }

    if(state.selectedModel) DOM.modelSelect.value = state.selectedModel;
    setupSpeechRecognition();
    setupArtifactModal();
}

function saveState() {
    localStorage.setItem('quasar_state', JSON.stringify(state));
}

// --- 3. UI TOGGLES & THEME ---
function setTheme(theme) {
    state.theme = theme;
    if (theme === 'dark') DOM.html.classList.add('dark');
    else DOM.html.classList.remove('dark');
    saveState();
}

DOM.themeToggleBtn.onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

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

DOM.userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 192) + 'px';
    validateInput();
});

function validateInput() {
    const hasText = DOM.userInput.value.trim().length > 0;
    const hasFile = !!currentAttachment;
    const hasModel = !!DOM.modelSelect.value;
    DOM.sendBtn.disabled = !( (hasText || hasFile) && hasModel );
}

DOM.modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
    saveState();
    validateInput();
});

// --- 4. CUSTOM MODEL DROPDOWN ---
function setupModelDropdown() {
    if (!DOM.modelDropdownBtn || !DOM.modelDropdownMenu) return;
    
    DOM.modelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.modelDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        DOM.modelDropdownMenu.classList.add('hidden');
    });

    DOM.modelDropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function selectModel(providerKey, modelId) {
    state.selectedModel = `${providerKey}|${modelId}`;
    const modelName = modelId.split('/').pop();
    DOM.modelDropdownLabel.textContent = modelName;
    DOM.modelDropdownMenu.classList.add('hidden');
    
    if (DOM.modelSelect) DOM.modelSelect.value = state.selectedModel;
    
    const allItems = DOM.modelDropdownMenu.querySelectorAll('.model-item');
    allItems.forEach(item => {
        const itemFullId = item.getAttribute('data-model-id');
        if (itemFullId === state.selectedModel) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    saveState();
    validateInput();
}

// --- 5. CHAT MANAGEMENT ---
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function createNewChat(switchChat = true) {
    const id = generateId();
    state.chats[id] = { id, title: 'New Chat', messages: [], updatedAt: Date.now() };
    if (switchChat) {
        state.currentChatId = id;
        renderChat(id);
        if(window.innerWidth <= 768) closeMobileSidebar();
    }
    saveState();
    renderChatList();
}

function selectChat(id) {
    state.currentChatId = id;
    saveState();
    renderChat(id);
    renderChatList();
    if(window.innerWidth <= 768) closeMobileSidebar();
}

function deleteChat(id, event) {
    event.stopPropagation();
    if(confirm('Are you sure you want to delete this chat?')) {
        delete state.chats[id];
        if(state.currentChatId === id) {
            const remaining = Object.keys(state.chats);
            if(remaining.length > 0) selectChat(remaining[0]);
            else createNewChat();
        } else {
            renderChatList();
            saveState();
        }
    }
}

function clearAllChats() {
    if(confirm('Are you sure you want to permanently delete ALL chats?')) {
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
        if(state.currentChatId === id) DOM.currentChatTitle.textContent = newName.trim();
    }
}

function renderChatList() {
    const fragment = document.createDocumentFragment();
    const sortedIds = Object.keys(state.chats).sort((a,b) => state.chats[b].updatedAt - state.chats[a].updatedAt);
    
    sortedIds.forEach(id => {
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
                <button onclick="renameChat('${id}', event)" class="p-1.5 text-slate-400 hover:text-brand-500 rounded bg-slate-50 dark:bg-slate-700/50" title="Rename"><i class="fas fa-pen text-[10px]"></i></button>
                <button onclick="deleteChat('${id}', event)" class="p-1.5 text-slate-400 hover:text-red-500 rounded bg-slate-50 dark:bg-slate-700/50" title="Delete"><i class="fas fa-trash text-[10px]"></i></button>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    DOM.chatList.innerHTML = '';
    DOM.chatList.appendChild(fragment);
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

// --- 6. ARTIFACT / CODE BLOCK RENDERING ---

/**
 * Parse the AI response text and extract code blocks with their language and content.
 * Returns an array of segments: { type: 'text'|'code', content, lang }
 */
function parseMessageSegments(text) {
    const segments = [];
    // Match fenced code blocks: ```lang\ncode\n```
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Text before this code block
        if (match.index > lastIndex) {
            const textBefore = text.slice(lastIndex, match.index).trim();
            if (textBefore) segments.push({ type: 'text', content: textBefore });
        }
        segments.push({ type: 'code', lang: (match[1] || 'plaintext').toLowerCase(), content: match[2] });
        lastIndex = match.index + match[0].length;
    }

    // Remaining text after the last code block
    if (lastIndex < text.length) {
        const textAfter = text.slice(lastIndex).trim();
        if (textAfter) segments.push({ type: 'text', content: textAfter });
    }

    // If no code blocks found, just return as text
    if (segments.length === 0) {
        segments.push({ type: 'text', content: text });
    }

    return segments;
}

/**
 * Build an interactive artifact block (like Claude's artifacts panel)
 */
function buildArtifactBlock(lang, code) {
    const blockId = 'artifact-' + generateId();
    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);
    const icon = LANG_ICONS[lang] || 'fas fa-code';
    const langLabel = lang === 'plaintext' ? 'Code' : lang.toUpperCase();

    const wrapper = document.createElement('div');
    wrapper.className = 'artifact-block';
    wrapper.id = blockId;

    // Escape code for display in <pre>
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    wrapper.innerHTML = `
        <div class="artifact-header">
            <div class="artifact-header-left">
                <i class="${icon} artifact-lang-icon"></i>
                <span class="artifact-lang-label">${langLabel}</span>
            </div>
            <div class="artifact-header-right">
                ${isPreviewable ? `
                <div class="artifact-tabs">
                    <button class="artifact-tab active" onclick="switchArtifactTab('${blockId}', 'code', this)">
                        <i class="fas fa-code"></i> Code
                    </button>
                    <button class="artifact-tab" onclick="switchArtifactTab('${blockId}', 'preview', this)">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                </div>
                ` : ''}
                <button class="artifact-action-btn" onclick="copyArtifactCode('${blockId}')" title="Copy code">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="artifact-action-btn" onclick="openArtifactFullscreen('${blockId}')" title="Open fullscreen">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </div>
        </div>
        <div class="artifact-body">
            <div class="artifact-code-pane" id="${blockId}-code">
                <pre class="artifact-pre"><code class="artifact-code lang-${lang}">${escapedCode}</code></pre>
            </div>
            ${isPreviewable ? `
            <div class="artifact-preview-pane hidden" id="${blockId}-preview">
                <iframe class="artifact-iframe" sandbox="allow-scripts allow-same-origin" title="Preview"></iframe>
            </div>
            ` : ''}
        </div>
    `;

    // Store code on element for later use
    wrapper.dataset.code = code;
    wrapper.dataset.lang = lang;

    return wrapper;
}

function switchArtifactTab(blockId, tab, btn) {
    const block = document.getElementById(blockId);
    if (!block) return;

    // Update tab buttons
    block.querySelectorAll('.artifact-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const codePane = document.getElementById(`${blockId}-code`);
    const previewPane = document.getElementById(`${blockId}-preview`);

    if (tab === 'code') {
        codePane?.classList.remove('hidden');
        previewPane?.classList.add('hidden');
    } else {
        codePane?.classList.add('hidden');
        previewPane?.classList.remove('hidden');
        // Inject content into iframe
        if (previewPane) {
            const iframe = previewPane.querySelector('iframe');
            if (iframe && !iframe.dataset.loaded) {
                const code = block.dataset.code;
                const lang = block.dataset.lang;
                let html = code;
                if (lang === 'svg') {
                    html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff">${code}</body></html>`;
                }
                iframe.srcdoc = html;
                iframe.dataset.loaded = '1';
            }
        }
    }
}

function copyArtifactCode(blockId) {
    const block = document.getElementById(blockId);
    if (!block) return;
    const code = block.dataset.code;
    const btn = block.querySelector('[title="Copy code"]');

    navigator.clipboard.writeText(code).then(() => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i>';
                btn.classList.remove('copied');
            }, 2000);
        }
        showToast('Code copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy code');
    });
}

function openArtifactFullscreen(blockId) {
    const block = document.getElementById(blockId);
    if (!block) return;
    const code = block.dataset.code;
    const lang = block.dataset.lang;
    showArtifactModal(code, lang);
}

// --- 7. ARTIFACT MODAL ---
function setupArtifactModal() {
    // Modal is injected once
    if (document.getElementById('artifactModal')) return;

    const modal = document.createElement('div');
    modal.id = 'artifactModal';
    modal.className = 'artifact-modal hidden';
    modal.innerHTML = `
        <div class="artifact-modal-backdrop" onclick="closeArtifactModal()"></div>
        <div class="artifact-modal-panel">
            <div class="artifact-modal-header">
                <div class="artifact-modal-title">
                    <i class="fas fa-code" id="artifactModalIcon"></i>
                    <span id="artifactModalLang">Code</span>
                </div>
                <div class="artifact-modal-tabs" id="artifactModalTabs"></div>
                <div class="artifact-modal-actions">
                    <button class="artifact-action-btn" onclick="copyArtifactModalCode()" title="Copy code" id="artifactModalCopyBtn">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="artifact-action-btn" onclick="closeArtifactModal()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="artifact-modal-body">
                <div id="artifactModalCodePane">
                    <pre class="artifact-pre h-full"><code id="artifactModalCode" class="artifact-code"></code></pre>
                </div>
                <div id="artifactModalPreviewPane" class="hidden h-full">
                    <iframe id="artifactModalIframe" class="artifact-iframe h-full" sandbox="allow-scripts allow-same-origin" title="Preview"></iframe>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeArtifactModal();
    });
}

let _modalCode = '';
let _modalLang = '';

function showArtifactModal(code, lang) {
    _modalCode = code;
    _modalLang = lang;

    const modal = document.getElementById('artifactModal');
    const icon = document.getElementById('artifactModalIcon');
    const langLabel = document.getElementById('artifactModalLang');
    const codeEl = document.getElementById('artifactModalCode');
    const tabs = document.getElementById('artifactModalTabs');
    const codePane = document.getElementById('artifactModalCodePane');
    const previewPane = document.getElementById('artifactModalPreviewPane');
    const iframe = document.getElementById('artifactModalIframe');

    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);

    icon.className = LANG_ICONS[lang] || 'fas fa-code';
    langLabel.textContent = lang === 'plaintext' ? 'Code' : lang.toUpperCase();

    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeEl.innerHTML = escapedCode;
    codeEl.className = `artifact-code lang-${lang}`;

    // Reset panes
    codePane.classList.remove('hidden');
    previewPane.classList.add('hidden');
    iframe.removeAttribute('srcdoc');
    iframe.removeAttribute('data-loaded');

    // Tabs
    if (isPreviewable) {
        tabs.innerHTML = `
            <button class="artifact-tab active" onclick="switchModalTab('code', this)"><i class="fas fa-code"></i> Code</button>
            <button class="artifact-tab" onclick="switchModalTab('preview', this)"><i class="fas fa-eye"></i> Preview</button>
        `;
        tabs.classList.remove('hidden');
    } else {
        tabs.innerHTML = '';
        tabs.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function switchModalTab(tab, btn) {
    const tabs = document.getElementById('artifactModalTabs');
    tabs.querySelectorAll('.artifact-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const codePane = document.getElementById('artifactModalCodePane');
    const previewPane = document.getElementById('artifactModalPreviewPane');
    const iframe = document.getElementById('artifactModalIframe');

    if (tab === 'code') {
        codePane.classList.remove('hidden');
        previewPane.classList.add('hidden');
    } else {
        codePane.classList.add('hidden');
        previewPane.classList.remove('hidden');
        if (!iframe.dataset.loaded) {
            let html = _modalCode;
            if (_modalLang === 'svg') {
                html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff">${_modalCode}</body></html>`;
            }
            iframe.srcdoc = html;
            iframe.dataset.loaded = '1';
        }
    }
}

function copyArtifactModalCode() {
    navigator.clipboard.writeText(_modalCode).then(() => {
        const btn = document.getElementById('artifactModalCopyBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i>';
                btn.classList.remove('copied');
            }, 2000);
        }
        showToast('Code copied!', 'success');
    }).catch(() => showToast('Failed to copy'));
}

function closeArtifactModal() {
    const modal = document.getElementById('artifactModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// --- 8. MESSAGE UI WITH ARTIFACT BLOCKS ---
function appendMessageUI(role, text, attachment = null) {
    if (DOM.chatWindow.querySelector('.fa-meteor.animate-pulse')) {
        DOM.chatWindow.innerHTML = '';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in gap-2 group`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[90%] md:max-w-[80%] p-4 md:p-5 rounded-2xl shadow-sm ${role === 'user' ? 'message-user rounded-br-sm' : 'message-ai rounded-bl-sm'}`;
    
    if (attachment) {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'mb-3 max-w-[250px] rounded-lg overflow-hidden border border-white/20';
        imgDiv.innerHTML = `<img src="${attachment.dataUrl}" alt="Attachment" class="w-full h-auto object-cover" loading="lazy">`;
        bubble.appendChild(imgDiv);
    }

    if (role === 'ai') {
        const segments = parseMessageSegments(text);

        segments.forEach(seg => {
            if (seg.type === 'text' && seg.content.trim()) {
                const textDiv = document.createElement('div');
                textDiv.className = 'prose prose-sm md:prose-base dark:prose-invert max-w-none text-current leading-relaxed';
                try {
                    textDiv.innerHTML = marked.parse(seg.content);
                } catch(e) {
                    textDiv.textContent = seg.content;
                }
                bubble.appendChild(textDiv);
            } else if (seg.type === 'code') {
                bubble.classList.add('has-artifact');
                const artifactEl = buildArtifactBlock(seg.lang, seg.content);
                bubble.appendChild(artifactEl);
            }
        });

    } else {
        const textDiv = document.createElement('div');
        textDiv.className = 'whitespace-pre-wrap text-sm md:text-base leading-relaxed';
        textDiv.textContent = text;
        bubble.appendChild(textDiv);
    }

    bubble.setAttribute('data-message-text', text);
    wrapper.appendChild(bubble);

    // Copy button
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex items-start opacity-0 group-hover:opacity-100 transition-opacity pt-1';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
    copyBtn.title = 'Copy message';
    copyBtn.type = 'button';
    copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>';
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check text-sm text-emerald-500"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>';
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy message');
        });
    };
    
    buttonContainer.appendChild(copyBtn);
    wrapper.appendChild(buttonContainer);
    DOM.chatWindow.appendChild(wrapper);
    
    clearTimeout(appendMessageUI.scrollTimeout);
    appendMessageUI.scrollTimeout = setTimeout(scrollToBottom, 0);
    
    return wrapper;
}

// --- 9. SETTINGS & MODEL FETCHING ---
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
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
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
                <h4 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <i class="fas fa-microchip text-slate-400"></i> ${info.name}
                </h4>
                <div id="status-${provKey}" class="text-xs font-medium">
                    ${hasModels 
                        ? '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>' 
                        : '<span class="text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-white/5">Not Configured</span>'}
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 mt-1">
                <div class="relative flex-grow">
                    <input type="password" id="key-${provKey}" value="${currentKey}" placeholder="API Key" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 ring-brand-500 text-slate-800 dark:text-slate-200 transition-all font-mono">
                    <a href="${info.link}" target="_blank" class="absolute right-3 top-2.5 text-slate-400 hover:text-brand-500" title="Get API Key"><i class="fas fa-external-link-alt text-xs"></i></a>
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

    if (!key) {
        showToast(`Please enter an API key for ${DEFAULT_PROVIDERS[provider].name}.`);
        return;
    }

    state.keys[provider] = key;
    icon.className = 'fas fa-spinner fa-spin';

    if (provider === 'anthropic') {
        setTimeout(() => {
            state.models[provider] = ANTHROPIC_HARDCODED_MODELS; 
            saveState();
            updateModelSelector();
            icon.className = 'fas fa-link';
            statusDiv.innerHTML = '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>';
            showToast(`Successfully connected to Anthropic.`, 'success');
        }, 400); 
        return;
    }

    try {
        let models = [];
        const url = DEFAULT_PROVIDERS[provider].url;

        if (provider === 'google') {
            const res = await fetch(`${url}?key=${key}`);
            const data = await res.json();
            if(data.error) throw new Error(data.error.message);
            models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).map(m => m.name.replace('models/', ''));
        } else {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` } });
            const data = await res.json();
            if(data.error) throw new Error(data.error.message);
            models = data.data.map(m => m.id);
        }

        state.models[provider] = models.sort();
        saveState();
        updateModelSelector();
        
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
                
                modelBtn.innerHTML = `
                    <span class="model-name-text">${modelShortName}</span>
                    <i class="fas fa-check selected-icon ml-auto opacity-0"></i>
                `;
                
                modelBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectModel(provKey, m);
                };
                groupDiv.appendChild(modelBtn);
                
                const option = document.createElement('option');
                option.value = modelFullId;
                option.textContent = m;
                DOM.modelSelect.appendChild(option);
            });
            
            fragment.appendChild(groupDiv);
        }
    });

    DOM.modelDropdownMenu.innerHTML = '';
    if (hasModels) {
        DOM.modelDropdownMenu.appendChild(fragment);
    } else {
        DOM.modelDropdownMenu.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No models available. Connect an API in Settings.</div>';
    }

    if (!hasModels) {
        DOM.modelDropdownLabel.textContent = 'Setup API in Settings';
    } else if (!state.selectedModel) {
        const firstProv = Object.keys(state.models).find(k => state.models[k].length > 0);
        if (firstProv) selectModel(firstProv, state.models[firstProv][0]);
    } else {
        const [pk, mid] = state.selectedModel.split('|');
        DOM.modelDropdownLabel.textContent = mid.split('/').pop();
    }
    
    validateInput();
}

// --- 10. FILE & VOICE INPUT ---
DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        currentAttachment = {
            dataUrl: event.target.result,
            type: file.type,
            name: file.name
        };
        DOM.attachmentName.textContent = file.name;
        DOM.attachmentPreview.classList.remove('hidden');
        validateInput();
    };
    reader.readAsDataURL(file);
});

DOM.removeAttachmentBtn.onclick = () => {
    currentAttachment = null;
    DOM.fileInput.value = '';
    DOM.attachmentPreview.classList.add('hidden');
    validateInput();
};

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        DOM.voiceBtn.style.display = 'none';
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    let isRecording = false;

    recognition.onstart = () => {
        isRecording = true;
        DOM.voiceBtn.classList.add('text-red-500', 'animate-pulse');
        showToast('🎤 Listening...', 'success');
    };
    
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                DOM.userInput.value += (DOM.userInput.value ? ' ' : '') + transcript;
            }
        }
        validateInput();
        DOM.userInput.dispatchEvent(new Event('input'));
    };

    recognition.onerror = (event) => {
        const errorMessages = {
            'no-speech': '❌ No speech detected.',
            'audio-capture': '❌ No microphone found.',
            'network': '❌ Network error.',
            'not-allowed': '❌ Microphone denied.',
        };
        showToast(errorMessages[event.error] || `❌ Error: ${event.error}`);
        stopRec();
    };

    recognition.onend = () => stopRec();

    function stopRec() {
        isRecording = false;
        DOM.voiceBtn.classList.remove('text-red-500', 'animate-pulse');
    }

    DOM.voiceBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isRecording) recognition.stop();
        else { try { recognition.start(); } catch(err) { showToast('❌ Failed to start microphone'); } }
    };
}

// --- 11. MESSAGE SENDING & API ---
DOM.chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = DOM.userInput.value.trim();
    const selected = state.selectedModel;
    if ((!text && !currentAttachment) || !selected) return;

    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) {
        showToast(`API Key missing for ${provider}. Please configure in Settings.`);
        openSettings('api');
        return;
    }

    const userMsg = { role: 'user', text, attachment: currentAttachment };
    state.chats[state.currentChatId].messages.push(userMsg);
    state.chats[state.currentChatId].updatedAt = Date.now();
    
    if (state.chats[state.currentChatId].title === 'New Chat' && text) {
        state.chats[state.currentChatId].title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        renderChatList();
    }
    
    appendMessageUI('user', text, currentAttachment);
    
    DOM.userInput.value = '';
    DOM.userInput.style.height = 'auto';
    DOM.removeAttachmentBtn.click();
    
    // Show thinking indicator
    const thinkingWrapper = document.createElement('div');
    thinkingWrapper.className = 'flex w-full justify-start animate-slide-in gap-2';
    thinkingWrapper.innerHTML = `
        <div class="max-w-[90%] md:max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
            <span class="flex items-center gap-2 text-sm text-slate-500">
                <i class="fas fa-circle-notch fa-spin text-brand-500"></i> Thinking...
            </span>
        </div>
    `;
    DOM.chatWindow.appendChild(thinkingWrapper);
    scrollToBottom();
    
    try {
        const history = state.chats[state.currentChatId].messages.slice(-12);
        const responseText = await callAIProvider(provider, modelId, apiKey, history);
        
        // Remove thinking indicator
        thinkingWrapper.remove();
        
        // Append the real AI message
        appendMessageUI('ai', responseText);
        
        state.chats[state.currentChatId].messages.push({ role: 'ai', text: responseText });
        state.chats[state.currentChatId].updatedAt = Date.now();
        
        saveState();
        renderChatList(); 
        
    } catch (err) {
        thinkingWrapper.innerHTML = `
            <div class="max-w-[80%] p-4 rounded-2xl shadow-sm message-ai rounded-bl-sm">
                <div class="text-red-500 text-sm flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle"></i> Error: ${err.message}
                </div>
            </div>
        `;
    }
};

DOM.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if(!DOM.sendBtn.disabled) DOM.chatForm.dispatchEvent(new Event('submit'));
    }
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
            if (msg.attachment) {
                const base64Data = msg.attachment.dataUrl.split(',')[1];
                parts.push({ inlineData: { mimeType: msg.attachment.type, data: base64Data } });
            }
            return { role: msg.role === 'ai' ? 'model' : 'user', parts };
        });

    } else if (provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true' 
        };
        
        const anthropicMessages = [];
        for (const msg of messagesHistory) {
            let content = [];
            if (msg.text) content.push({ type: 'text', text: msg.text });
            if (msg.attachment && msg.role === 'user') {
                const base64Data = msg.attachment.dataUrl.split(',')[1];
                content.push({ type: 'image', source: { type: 'base64', media_type: msg.attachment.type, data: base64Data } });
            }
            anthropicMessages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content });
        }
        body = { model: modelId, max_tokens: 4096, system: SYSTEM_PROMPT, messages: anthropicMessages };

    } else {
        if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';

        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if(provider === 'openrouter') {
            headers['HTTP-Referer'] = window.location.href;
            headers['X-Title'] = 'Quasar AI';
        }

        const openAiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messagesHistory.map(msg => {
                const mappedRole = msg.role === 'ai' ? 'assistant' : 'user';
                if (msg.attachment && mappedRole === 'user') {
                    return {
                        role: mappedRole,
                        content: [
                            { type: 'text', text: msg.text || "Describe this image." },
                            { type: 'image_url', image_url: { url: msg.attachment.dataUrl } }
                        ]
                    };
                }
                return { role: mappedRole, content: msg.text };
            })
        ];

        body = { model: modelId, messages: openAiMessages };
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await response.json();
    
    if (!response.ok) {
        const errMsg = data.error?.message || data.error?.type || JSON.stringify(data);
        throw new Error(errMsg);
    }

    if (provider === 'google') return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    else if (provider === 'anthropic') return data.content?.[0]?.text || "No response.";
    else return data.choices?.[0]?.message?.content || "No response.";
}

init();
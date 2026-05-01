// --- STATE & DOM CACHE ---
let state = {
    keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '', mistral: '' },
    models: { google: [], openai: [], anthropic: [], groq: [], openrouter: [], mistral: [] },
    chats: {},
    folders: {},   // keyed by folderId → { id, name, color }
    currentChatId: null,
    selectedModel: '',
    theme: 'light',
    sidebarCollapsed: false,
    searchQuery: ''
};

// Tracks sidebar folder collapse state (session-only, not persisted)
const collapsedFolders = new Set();

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
    chatFooter: document.getElementById('chatFooter'),
    welcomeHeadline: document.getElementById('welcomeHeadline'),
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
    tokenStatusBar: document.getElementById('tokenStatusBar'),
};

function updateTokenStatusBar(usage, modelId) {
    if (!usage || (!usage.inputTokens && !usage.outputTokens)) return;
    const { inputTokens, outputTokens } = usage;
    const pricing = MODEL_PRICING[modelId];

    let costPart = '';
    if (pricing) {
        if (pricing.label === 'free') {
            costPart = `<span class="mx-1 opacity-30">·</span><span style="color:#22c55e">free</span>`;
        } else {
            const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
            const fmt = cost < 0.0001 ? '<$0.0001' : '$' + cost.toFixed(4);
            costPart = `<span class="mx-1 opacity-30">·</span><span>${fmt}</span>`;
        }
    }

    DOM.tokenStatusBar.innerHTML =
        `<i class="fas fa-microchip mr-1" style="font-size:9px;opacity:0.5"></i>` +
        `<span>↑${inputTokens.toLocaleString()}</span>` +
        `<span class="mx-1 opacity-30">·</span>` +
        `<span>↓${outputTokens.toLocaleString()}</span>` +
        costPart;
    DOM.tokenStatusBar.classList.remove('hidden');
    DOM.tokenStatusBar.classList.add('flex');
}

function clearTokenStatusBar() {
    DOM.tokenStatusBar.classList.add('hidden');
    DOM.tokenStatusBar.classList.remove('flex');
}

function saveState(changedChatId = null) {
    localStorage.setItem('quasar_state', JSON.stringify(state));
    // Debounced sync for keys/settings
    clearTimeout(saveState._syncTimer);
    saveState._syncTimer = setTimeout(syncToServer, 2000);
    // Debounced sync for the specific chat that changed
    if (changedChatId) {
        if (!saveState._chatTimers) saveState._chatTimers = {};
        clearTimeout(saveState._chatTimers[changedChatId]);
        saveState._chatTimers[changedChatId] = setTimeout(() => syncChat(changedChatId), 2000);
    }
}

// --- STATE & DOM CACHE ---
let state = {
    keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
    models: { google: [], openai: [], anthropic: [], groq: [], openrouter: [] },
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

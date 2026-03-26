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
    DOM.modelSelect.value = state.selectedModel;
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
    DOM.chatList.innerHTML = '';
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
        DOM.chatList.appendChild(div);
    });
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

function appendMessageUI(role, text, attachment = null) {
    if (DOM.chatWindow.querySelector('.fa-meteor.animate-pulse')) {
        DOM.chatWindow.innerHTML = '';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in gap-2 group`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[90%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-sm ${role === 'user' ? 'message-user rounded-br-sm' : 'message-ai rounded-bl-sm'}`;
    
    let contentHtml = '';

    if (attachment) {
        contentHtml += `<div class="mb-3 max-w-[250px] rounded-lg overflow-hidden border border-white/20"><img src="${attachment.dataUrl}" alt="Attachment" class="w-full h-auto object-cover"></div>`;
    }

    if (role === 'ai') {
        contentHtml += `<div class="prose prose-sm md:prose-base dark:prose-invert max-w-none text-current leading-relaxed">${marked.parse(text)}</div>`;
    } else {
        contentHtml += `<div class="whitespace-pre-wrap text-sm md:text-base leading-relaxed">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    }

    bubble.innerHTML = contentHtml;
    bubble.setAttribute('data-message-text', text);
    wrapper.appendChild(bubble);

    // Add copy button
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex items-start opacity-0 group-hover:opacity-100 transition-opacity pt-1';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
    copyBtn.title = 'Copy message';
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
    scrollToBottom();
    return wrapper;
}

// --- 6. SETTINGS & MODEL FETCHING ---
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
    DOM.modelSelect.innerHTML = '';
    if (!DOM.modelDropdownMenu) return;
    DOM.modelDropdownMenu.innerHTML = '';
    let hasModels = false;
    
    Object.keys(state.models).forEach((provKey) => {
        const provModels = state.models[provKey];
        if (provModels && provModels.length > 0) {
            hasModels = true;
            
            // Create provider group
            const groupDiv = document.createElement('div');
            groupDiv.className = 'model-provider-group';
            
            // Provider name label
            const providerLabel = document.createElement('span');
            providerLabel.className = 'model-provider-name';
            providerLabel.textContent = DEFAULT_PROVIDERS[provKey].name;
            groupDiv.appendChild(providerLabel);
            
            // Add models for this provider
            provModels.forEach((m) => {
                const modelBtn = document.createElement('button');
                modelBtn.type = 'button';
                modelBtn.className = 'model-item';
                modelBtn.textContent = m.split('/').pop();
                modelBtn.onclick = (e) => {
                    e.preventDefault();
                    selectModel(provKey, m);
                    updateModelSelector();
                };
                groupDiv.appendChild(modelBtn);
                
                // Add to hidden select
                const option = document.createElement('option');
                option.value = `${provKey}|${m}`;
                option.textContent = m;
                DOM.modelSelect.appendChild(option);
            });
            
            DOM.modelDropdownMenu.appendChild(groupDiv);
        }
    });

    if (!hasModels) {
        DOM.modelDropdownLabel.textContent = 'Setup API in Settings';
    } else {
        const activeButtons = DOM.modelDropdownMenu.querySelectorAll('.model-item');
        activeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (state.selectedModel && btn.textContent === state.selectedModel.split('|')[1].split('/').pop()) {
                btn.classList.add('active');
                DOM.modelDropdownLabel.textContent = btn.textContent;
            }
        });
        
        if (!state.selectedModel && activeButtons.length > 0) {
            activeButtons[0].click();
        }
    }
    validateInput();
}

// --- 7. FILE & VOICE INPUT ---
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
    recognition.lang = 'en-US'; // Default language
    
    let isRecording = false;
    let interimTranscript = '';

    recognition.onstart = () => {
        isRecording = true;
        interimTranscript = '';
        DOM.voiceBtn.classList.add('text-red-500', 'animate-pulse');
        showToast('🎤 Listening...', 'success');
    };
    
    recognition.onresult = (event) => {
        interimTranscript = '';
        let isFinal = false;
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                isFinal = true;
                // Add final transcript
                DOM.userInput.value += (DOM.userInput.value ? ' ' : '') + transcript;
            } else {
                // Show interim results
                interimTranscript += transcript;
            }
        }
        
        // Show interim text in placeholder or console
        if (interimTranscript) {
            console.log('Interim:', interimTranscript);
        }
        
        validateInput();
        DOM.userInput.dispatchEvent(new Event('input'));
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        const errorMessages = {
            'no-speech': '❌ No speech detected. Please try again.',
            'audio-capture': '❌ No microphone found.',
            'network': '❌ Network error. Check your connection.',
            'not-allowed': '❌ Microphone permission denied.',
            'bad-grammar': '❌ Grammar error.',
            'service-not-allowed': '❌ Speech recognition service not allowed.'
        };
        const message = errorMessages[event.error] || `❌ Error: ${event.error}`;
        showToast(message);
        stopRec();
    };

    recognition.onend = () => {
        stopRec();
    };

    function stopRec() {
        isRecording = false;
        interimTranscript = '';
        DOM.voiceBtn.classList.remove('text-red-500', 'animate-pulse');
    }

    DOM.voiceBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isRecording) {
            recognition.stop();
            showToast('✅ Recording stopped', 'success');
        } else {
            try {
                recognition.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
                showToast('❌ Failed to start microphone');
            }
        }
    };
}

// --- 8. MESSAGE SENDING & API ABSTRACTION ---
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
    
    const aiBubble = appendMessageUI('ai', '<span class="flex items-center gap-2"><i class="fas fa-circle-notch fa-spin text-brand-500"></i> Thinking...</span>');
    
    try {
        const history = state.chats[state.currentChatId].messages.slice(-12);
        const responseText = await callAIProvider(provider, modelId, apiKey, history);
        
        aiBubble.querySelector('.prose').innerHTML = marked.parse(responseText);
        
        state.chats[state.currentChatId].messages.push({ role: 'ai', text: responseText });
        state.chats[state.currentChatId].updatedAt = Date.now();
        saveState();
        renderChatList(); 
        
    } catch (err) {
        aiBubble.innerHTML = `<div class="text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${err.message}</div>`;
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
        body = { model: modelId, max_tokens: 4096, messages: anthropicMessages };

    } else {
        if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';

        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if(provider === 'openrouter') {
            headers['HTTP-Referer'] = window.location.href;
            headers['X-Title'] = 'Quasar AI';
        }

        const openAiMessages = messagesHistory.map(msg => {
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
        });

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
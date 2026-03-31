// =============================================================
// FOLDERS FEATURE — script.js patch
// =============================================================
// This file documents every change needed in script.js.
// Changes are grouped by section with clear REPLACE / ADD markers.
// =============================================================


// ─────────────────────────────────────────────────────────────
// 1. STATE  (replace the `let state = { ... }` block)
// ─────────────────────────────────────────────────────────────
// ADD `folders: {}` to the state object:

let state = {
    keys: { google: '', openai: '', anthropic: '', groq: '', openrouter: '' },
    models: { google: [], openai: [], anthropic: [], groq: [], openrouter: [] },
    chats: {},
    folders: {},            // keyed by folderId: { id, name, color }
    currentChatId: null,
    selectedModel: '',
    theme: 'light',
    sidebarCollapsed: false,
    searchQuery: ''
};


// ─────────────────────────────────────────────────────────────
// 2. FOLDER COLOR MAP  (add near top, after LANG_ICONS)
// ─────────────────────────────────────────────────────────────

const FOLDER_COLORS = {
    gray:   { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-500 dark:text-slate-400',  icon: 'text-slate-400 dark:text-slate-500',  dot: 'bg-slate-400' },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',    icon: 'text-blue-400',                        dot: 'bg-blue-400' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400',  icon: 'text-green-500',                       dot: 'bg-green-400' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400',  icon: 'text-amber-500',                       dot: 'bg-amber-400' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-600 dark:text-red-400',      icon: 'text-red-400',                         dot: 'bg-red-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-400',                   dot: 'bg-purple-400' },
    pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',   text: 'text-pink-600 dark:text-pink-400',    icon: 'text-pink-400',                        dot: 'bg-pink-400' },
    teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',   text: 'text-teal-600 dark:text-teal-400',    icon: 'text-teal-500',                        dot: 'bg-teal-400' },
};


// ─────────────────────────────────────────────────────────────
// 3. SERVER SYNC — add folder sync functions
//    (add after the existing deleteServerChat function)
// ─────────────────────────────────────────────────────────────

async function syncFolder(folderId) {
    const token = getAuthToken();
    if (!token) return;
    const folder = state.folders[folderId];
    if (!folder) return;
    try {
        const res = await fetch('/api/folders/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ folderId: folder.id, name: folder.name, color: folder.color }),
        });
        if (res.status === 401) { clearAuthSession(); showAuthScreen(); showToast('Session expired. Please sign in again.', 'error'); }
    } catch (err) { console.warn('Failed to sync folder:', err); }
}

async function deleteServerFolder(folderId) {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch('/api/folders/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ folderId }),
        });
    } catch (err) { console.warn('Failed to delete folder from server:', err); }
}


// ─────────────────────────────────────────────────────────────
// 4. loadFromServer — REPLACE the existing function
//    Adds parallel folder fetch and merges into state.folders
// ─────────────────────────────────────────────────────────────

async function loadFromServer() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const [dataRes, chatsRes, foldersRes] = await Promise.all([
            fetch('/api/data/load',    { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/chats/list',   { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/folders/list', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        if ([dataRes, chatsRes, foldersRes].some(r => r.status === 401)) {
            clearAuthSession(); showAuthScreen();
            showToast('Your session has expired. Please sign in again.', 'error');
            return;
        }
        if (!dataRes.ok || !chatsRes.ok || !foldersRes.ok) return;

        const [data, chatsData, foldersData] = await Promise.all([
            dataRes.json(), chatsRes.json(), foldersRes.json(),
        ]);

        if (data.keys)         state.keys = { ...state.keys, ...data.keys };
        if (data.selectedModel) state.selectedModel = data.selectedModel;
        if (chatsData.chats && Object.keys(chatsData.chats).length > 0) state.chats = chatsData.chats;
        if (foldersData.folders) state.folders = { ...state.folders, ...foldersData.folders };

        localStorage.setItem('quasar_state', JSON.stringify(state));

        updateModelSelector();
        renderProviderSettings();
        if (Object.keys(state.chats).length === 0) {
            createNewChat(false);
        } else {
            if (!state.currentChatId || !state.chats[state.currentChatId]) {
                state.currentChatId = Object.keys(state.chats)
                    .sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt)[0];
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


// ─────────────────────────────────────────────────────────────
// 5. syncChat — REPLACE to also send folderId
// ─────────────────────────────────────────────────────────────

async function syncChat(chatId) {
    const token = getAuthToken();
    if (!token) return;
    const chat = state.chats[chatId];
    if (!chat) return;
    try {
        const res = await fetch('/api/chats/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                chatId:   chat.id,
                title:    chat.title,
                messages: chat.messages,
                folderId: chat.folderId ?? null,
            }),
        });
        if (res.status === 401) { clearAuthSession(); showAuthScreen(); showToast('Session expired. Please sign in again.', 'error'); }
    } catch (err) { console.warn('Failed to sync chat:', err); }
}


// ─────────────────────────────────────────────────────────────
// 6. createNewChat — REPLACE to accept optional folderId
// ─────────────────────────────────────────────────────────────

function createNewChat(switchToChat = true, folderId = null) {
    const id = generateId();
    state.chats[id] = { id, title: 'New Chat', messages: [], folderId: folderId ?? null, updatedAt: Date.now() };
    if (switchToChat) {
        state.currentChatId = id;
        renderChat(id);
        closeArtifactPanel();
        if (window.innerWidth <= 768) closeMobileSidebar();
    }
    saveState(id);
    renderChatList();
}


// ─────────────────────────────────────────────────────────────
// 7. FOLDER MANAGEMENT FUNCTIONS  (add after renameChat)
// ─────────────────────────────────────────────────────────────

function createFolder() {
    const name = prompt('Folder name:');
    if (!name || !name.trim()) return;
    const id = generateId();
    const colors = Object.keys(FOLDER_COLORS);
    const color = colors[Math.floor(Math.random() * colors.length)];
    state.folders[id] = { id, name: name.trim().slice(0, 64), color };
    saveState();
    // Sync folder to server immediately (not debounced — folders are lightweight)
    syncFolder(id);
    renderChatList();
}

function renameFolder(folderId, event) {
    event.stopPropagation();
    const folder = state.folders[folderId];
    if (!folder) return;
    const newName = prompt('Rename folder:', folder.name);
    if (!newName || !newName.trim()) return;
    state.folders[folderId].name = newName.trim().slice(0, 64);
    saveState();
    syncFolder(folderId);
    renderChatList();
}

function changeFolderColor(folderId, event) {
    event.stopPropagation();
    const folder = state.folders[folderId];
    if (!folder) return;
    const colors = Object.keys(FOLDER_COLORS);
    const currentIdx = colors.indexOf(folder.color);
    const nextColor = colors[(currentIdx + 1) % colors.length];
    state.folders[folderId].color = nextColor;
    saveState();
    syncFolder(folderId);
    renderChatList();
}

function deleteFolder(folderId, event) {
    event.stopPropagation();
    const folder = state.folders[folderId];
    if (!folder) return;
    if (!confirm(`Delete folder "${folder.name}"? Chats inside will be moved to Unfiled.`)) return;

    // Unassign all chats in this folder
    Object.values(state.chats).forEach(chat => {
        if (chat.folderId === folderId) {
            chat.folderId = null;
            // Sync each affected chat
            saveState._chatTimers = saveState._chatTimers || {};
            clearTimeout(saveState._chatTimers[chat.id]);
            saveState._chatTimers[chat.id] = setTimeout(() => syncChat(chat.id), 500);
        }
    });

    delete state.folders[folderId];
    deleteServerFolder(folderId);
    saveState();
    renderChatList();
}

function moveChatToFolder(chatId, folderId) {
    // folderId = null means "unfiled"
    if (!state.chats[chatId]) return;
    state.chats[chatId].folderId = folderId;
    saveState(chatId);
    renderChatList();
}

function showMoveToChatMenu(chatId, event) {
    event.stopPropagation();

    // Remove any existing menu
    document.getElementById('folderPickerMenu')?.remove();

    const menu = document.createElement('div');
    menu.id = 'folderPickerMenu';
    menu.className = 'fixed z-[200] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 min-w-[180px]';

    const currentFolderId = state.chats[chatId]?.folderId;

    // "Unfiled" option
    const unfiledBtn = document.createElement('button');
    unfiledBtn.className = `w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${!currentFolderId ? 'font-semibold text-brand-500' : 'text-slate-600 dark:text-slate-300'}`;
    unfiledBtn.innerHTML = `<i class="fas fa-inbox text-slate-400 w-4"></i> Unfiled${!currentFolderId ? ' <i class="fas fa-check ml-auto text-brand-500 text-xs"></i>' : ''}`;
    unfiledBtn.onclick = () => { moveChatToFolder(chatId, null); menu.remove(); };
    menu.appendChild(unfiledBtn);

    const folders = Object.values(state.folders).sort((a, b) => a.name.localeCompare(b.name));
    if (folders.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'my-1 border-t border-slate-100 dark:border-white/5';
        menu.appendChild(divider);

        folders.forEach(folder => {
            const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.gray;
            const isActive = currentFolderId === folder.id;
            const btn = document.createElement('button');
            btn.className = `w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isActive ? 'font-semibold text-brand-500' : 'text-slate-600 dark:text-slate-300'}`;
            btn.innerHTML = `<span class="w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}"></span>${escapeHtml(folder.name)}${isActive ? ' <i class="fas fa-check ml-auto text-brand-500 text-xs"></i>' : ''}`;
            btn.onclick = () => { moveChatToFolder(chatId, folder.id); menu.remove(); };
            menu.appendChild(btn);
        });
    }

    // Position the menu near the button
    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.top  = Math.min(rect.bottom + 4, window.innerHeight - 200) + 'px';
    menu.style.left = Math.max(rect.left - 100, 8) + 'px';

    document.body.appendChild(menu);

    // Close on outside click
    const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close, true); } };
    setTimeout(() => document.addEventListener('click', close, true), 0);
}


// ─────────────────────────────────────────────────────────────
// 8. renderChatList — REPLACE entirely
//    Groups chats by folder with collapsible sections
// ─────────────────────────────────────────────────────────────

// Tracks which folders are collapsed in the sidebar
const collapsedFolders = new Set();

function renderChatList() {
    const query = state.searchQuery;
    const allChats = Object.keys(state.chats)
        .sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt);

    const filteredIds = query === ''
        ? allChats
        : allChats.filter(id => {
            const chat = state.chats[id];
            return getSearchableText(chat).includes(query.toLowerCase());
        });

    const fragment = document.createDocumentFragment();

    if (filteredIds.length === 0) {
        DOM.chatList.classList.add('hidden');
        DOM.emptySearchState.classList.remove('hidden');
        return;
    }
    DOM.chatList.classList.remove('hidden');
    DOM.emptySearchState.classList.add('hidden');

    // Separate chats into their buckets
    const byFolder = {}; // folderId -> [chatId, ...]
    const unfiled  = [];

    filteredIds.forEach(id => {
        const fid = state.chats[id].folderId;
        if (fid && state.folders[fid]) {
            (byFolder[fid] = byFolder[fid] || []).push(id);
        } else {
            unfiled.push(id);
        }
    });

    // ── Render folder sections (sorted by folder name) ──
    const sortedFolders = Object.values(state.folders)
        .filter(f => byFolder[f.id]?.length > 0 || !query) // during search, only show folders with matches
        .sort((a, b) => a.name.localeCompare(b.name));

    // When searching, only show folders that contain matching chats
    const visibleFolders = query
        ? sortedFolders.filter(f => byFolder[f.id]?.length > 0)
        : sortedFolders;

    visibleFolders.forEach(folder => {
        const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.gray;
        const chatsInFolder = byFolder[folder.id] || [];
        const isCollapsed = collapsedFolders.has(folder.id) && !query;
        const count = chatsInFolder.length;

        // Folder header row
        const header = document.createElement('div');
        header.className = `group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-white/5 select-none mt-1`;
        header.onclick = () => {
            collapsedFolders[isCollapsed ? 'delete' : 'add'](folder.id);
            renderChatList();
        };
        header.innerHTML = `
            <i class="fas fa-chevron-right text-[9px] text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}" style="width:12px"></i>
            <i class="fas fa-folder${isCollapsed ? '' : '-open'} text-[13px] ${colors.icon} flex-shrink-0"></i>
            <span class="text-xs font-semibold truncate flex-1 ${colors.text}">${escapeHtml(folder.name)}</span>
            <span class="text-[10px] text-slate-400 font-medium ml-1">${count}</span>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button onclick="createNewChat(true, '${folder.id}')" title="New chat in folder" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800"><i class="fas fa-plus text-[9px]"></i></button>
                <button onclick="changeFolderColor('${folder.id}', event)" title="Change color" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800"><i class="fas fa-palette text-[9px]"></i></button>
                <button onclick="renameFolder('${folder.id}', event)" title="Rename folder" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800"><i class="fas fa-pen text-[9px]"></i></button>
                <button onclick="deleteFolder('${folder.id}', event)" title="Delete folder" class="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800"><i class="fas fa-trash text-[9px]"></i></button>
            </div>
        `;
        fragment.appendChild(header);

        // Chat items inside folder (hidden when collapsed)
        if (!isCollapsed) {
            chatsInFolder.forEach(id => {
                fragment.appendChild(buildChatItem(id, true));
            });
        }
    });

    // ── Unfiled section ──
    if (unfiled.length > 0) {
        // Only show "Unfiled" header if there are also folders
        if (Object.keys(state.folders).length > 0) {
            const unfiledHeader = document.createElement('div');
            unfiledHeader.className = 'flex items-center gap-1.5 px-2 py-1.5 mt-1 cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors';
            const unfiledCollapsed = collapsedFolders.has('__unfiled__') && !query;
            unfiledHeader.onclick = () => {
                collapsedFolders[unfiledCollapsed ? 'delete' : 'add']('__unfiled__');
                renderChatList();
            };
            unfiledHeader.innerHTML = `
                <i class="fas fa-chevron-right text-[9px] text-slate-400 transition-transform duration-200 ${unfiledCollapsed ? '' : 'rotate-90'}" style="width:12px"></i>
                <i class="fas fa-inbox text-[12px] text-slate-400"></i>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 flex-1">Unfiled</span>
                <span class="text-[10px] text-slate-400 font-medium">${unfiled.length}</span>
            `;
            fragment.appendChild(unfiledHeader);

            if (!unfiledCollapsed) {
                unfiled.forEach(id => fragment.appendChild(buildChatItem(id, false)));
            }
        } else {
            // No folders yet — render chats flat (original behavior)
            unfiled.forEach(id => fragment.appendChild(buildChatItem(id, false)));
        }
    }

    DOM.chatList.innerHTML = '';
    DOM.chatList.appendChild(fragment);
}

// Builds a single chat row (extracted from old renderChatList)
function buildChatItem(id, indented) {
    const chat = state.chats[id];
    const isSelected = id === state.currentChatId;
    const div = document.createElement('div');
    div.className = `group flex items-center justify-between rounded-xl cursor-pointer transition-all ${indented ? 'ml-4' : ''} ${
        isSelected
            ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/5 text-brand-600 dark:text-brand-400 font-medium'
            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 border border-transparent'
    } p-3`;
    div.onclick = () => selectChat(id);
    div.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden min-w-0">
            <i class="fas fa-message text-[11px] opacity-60 flex-shrink-0"></i>
            <span class="truncate text-sm">${escapeHtml(chat.title)}</span>
        </div>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onclick="showMoveToChatMenu('${id}', event)" title="Move to folder" class="p-1.5 text-slate-400 hover:text-brand-500 rounded bg-slate-50 dark:bg-slate-700/50"><i class="fas fa-folder-plus text-[9px]"></i></button>
            <button onclick="renameChat('${id}', event)" title="Rename" class="p-1.5 text-slate-400 hover:text-brand-500 rounded bg-slate-50 dark:bg-slate-700/50"><i class="fas fa-pen text-[10px]"></i></button>
            <button onclick="deleteChat('${id}', event)" title="Delete" class="p-1.5 text-slate-400 hover:text-red-500 rounded bg-slate-50 dark:bg-slate-700/50"><i class="fas fa-trash text-[10px]"></i></button>
        </div>
    `;
    return div;
}


// ─────────────────────────────────────────────────────────────
// 9. handleLogout — ADD folders reset (alongside existing resets)
// ─────────────────────────────────────────────────────────────
// In handleLogout(), add this line alongside the other state resets:
//   state.folders = {};


// ─────────────────────────────────────────────────────────────
// 10. index.html sidebar — ADD "New Folder" button
//
// In the sidebar's <div class="p-3 space-y-3"> section,
// add this button after the existing "New Chat" button:
// ─────────────────────────────────────────────────────────────

/*
<button onclick="createFolder()" class="w-full flex items-center gap-2 justify-center py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl transition-colors font-medium text-sm shadow-sm">
    <i class="fas fa-folder-plus text-slate-400"></i> New Folder
</button>
*/
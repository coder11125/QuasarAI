// --- FOLDER MANAGEMENT ---
function createFolder() {
    const name = prompt('Folder name:');
    if (!name || !name.trim()) return;
    const id = generateId();
    const colorKeys = Object.keys(FOLDER_COLORS);
    const color = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    state.folders[id] = { id, name: name.trim().slice(0, 64), color };
    saveState();
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

function cycleFolderColor(folderId, event) {
    event.stopPropagation();
    const folder = state.folders[folderId];
    if (!folder) return;
    const colorKeys = Object.keys(FOLDER_COLORS);
    const idx = colorKeys.indexOf(folder.color);
    state.folders[folderId].color = colorKeys[(idx + 1) % colorKeys.length];
    saveState();
    syncFolder(folderId);
    renderChatList();
}

function deleteFolder(folderId, event) {
    event.stopPropagation();
    const folder = state.folders[folderId];
    if (!folder) return;
    if (!confirm(`Delete folder "${folder.name}"?\n\nChats inside will be moved to Unfiled.`)) return;
    Object.values(state.chats).forEach(chat => {
        if (chat.folderId === folderId) {
            chat.folderId = null;
            clearTimeout((saveState._chatTimers || {})[chat.id]);
            saveState._chatTimers = saveState._chatTimers || {};
            saveState._chatTimers[chat.id] = setTimeout(() => syncChat(chat.id), 600);
        }
    });
    delete state.folders[folderId];
    collapsedFolders.delete(folderId);
    deleteServerFolder(folderId);
    saveState();
    renderChatList();
}

function moveChatToFolder(chatId, folderId) {
    if (!state.chats[chatId]) return;
    state.chats[chatId].folderId = folderId;
    saveState(chatId);
    renderChatList();
}

function showFolderPicker(chatId, event) {
    event.stopPropagation();
    document.getElementById('folderPickerMenu')?.remove();

    const menu = document.createElement('div');
    menu.id = 'folderPickerMenu';
    menu.className = 'fixed z-[500] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[190px]';

    const currentFolderId = state.chats[chatId]?.folderId;

    // Unfiled option
    const unfiledBtn = document.createElement('button');
    const unfiledActive = !currentFolderId;
    unfiledBtn.className = `w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors ${unfiledActive ? 'text-brand-500 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`;
    unfiledBtn.innerHTML = `<i class="fas fa-inbox text-slate-400" style="width:14px"></i><span class="flex-1">Unfiled</span>${unfiledActive ? '<i class="fas fa-check text-brand-500 text-xs"></i>' : ''}`;
    unfiledBtn.onclick = () => { moveChatToFolder(chatId, null); menu.remove(); };
    menu.appendChild(unfiledBtn);

    const sortedFolders = Object.values(state.folders).sort((a, b) => a.name.localeCompare(b.name));
    if (sortedFolders.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'my-1 border-t border-slate-100 dark:border-white/5';
        menu.appendChild(sep);
        sortedFolders.forEach(folder => {
            const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.gray;
            const isActive = currentFolderId === folder.id;
            const btn = document.createElement('button');
            btn.className = `w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors ${isActive ? 'text-brand-500 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`;
            btn.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${colors.dot};flex-shrink:0;display:inline-block"></span><span class="flex-1 truncate">${escapeHtml(folder.name)}</span>${isActive ? '<i class="fas fa-check text-brand-500 text-xs"></i>' : ''}`;
            btn.onclick = () => { moveChatToFolder(chatId, folder.id); menu.remove(); };
            menu.appendChild(btn);
        });
    }

    const rect = (event.currentTarget || event.target).getBoundingClientRect();
    menu.style.top  = Math.min(rect.bottom + 4, window.innerHeight - 240) + 'px';
    menu.style.left = Math.max(rect.left - 120, 8) + 'px';
    document.body.appendChild(menu);

    const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close, true); } };
    setTimeout(() => document.addEventListener('click', close, true), 0);
}

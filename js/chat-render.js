// --- RENDER CHAT LIST (folder-grouped) ---
function renderChatList() {
    const query = (state.searchQuery || '').toLowerCase();
    const allIds = Object.keys(state.chats).sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt);
    const filteredIds = query
        ? allIds.filter(id => getSearchableText(state.chats[id]).includes(query))
        : allIds;

    if (filteredIds.length === 0) {
        DOM.chatList.innerHTML = '';
        DOM.chatList.classList.add('hidden');
        DOM.emptySearchState.classList.remove('hidden');
        return;
    }
    DOM.chatList.classList.remove('hidden');
    DOM.emptySearchState.classList.add('hidden');

    const hasFolders = Object.keys(state.folders).length > 0;

    // Bucket chats
    const byFolder = {};
    const unfiled = [];
    filteredIds.forEach(id => {
        const fid = state.chats[id].folderId;
        if (fid && state.folders[fid]) {
            (byFolder[fid] = byFolder[fid] || []).push(id);
        } else {
            unfiled.push(id);
        }
    });

    const fragment = document.createDocumentFragment();

    // ── Folder sections ──
    const sortedFolders = Object.values(state.folders)
        .filter(f => !query || (byFolder[f.id] && byFolder[f.id].length > 0))
        .sort((a, b) => a.name.localeCompare(b.name));

    sortedFolders.forEach(folder => {
        const colors = FOLDER_COLORS[folder.color] || FOLDER_COLORS.gray;
        const chatsInFolder = byFolder[folder.id] || [];
        const isCollapsed = collapsedFolders.has(folder.id) && !query;

        // Folder header
        const header = document.createElement('div');
        header.className = 'group flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-white/5 transition-colors mt-0.5';
        header.onclick = () => {
            if (isCollapsed) collapsedFolders.delete(folder.id);
            else collapsedFolders.add(folder.id);
            renderChatList();
        };
        header.innerHTML = `
            <i class="fas fa-chevron-right text-slate-400 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}" style="font-size:9px;width:10px;flex-shrink:0"></i>
            <i class="fas fa-folder${isCollapsed ? '' : '-open'}" style="font-size:12px;color:${colors.icon};flex-shrink:0"></i>
            <span class="text-xs font-semibold truncate flex-1" style="color:${colors.label}">${escapeHtml(folder.name)}</span>
            <span class="text-[10px] text-slate-400 font-medium">${chatsInFolder.length}</span>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                <button onclick="createNewChat(true,'${folder.id}')" title="New chat in folder" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-700 transition-colors"><i class="fas fa-plus" style="font-size:9px"></i></button>
                <button onclick="cycleFolderColor('${folder.id}',event)" title="Change color" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-700 transition-colors"><i class="fas fa-palette" style="font-size:9px"></i></button>
                <button onclick="renameFolder('${folder.id}',event)" title="Rename" class="p-1 rounded text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-700 transition-colors"><i class="fas fa-pen" style="font-size:9px"></i></button>
                <button onclick="deleteFolder('${folder.id}',event)" title="Delete folder" class="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition-colors"><i class="fas fa-trash" style="font-size:9px"></i></button>
            </div>
        `;
        fragment.appendChild(header);

        if (!isCollapsed) {
            chatsInFolder.forEach(id => fragment.appendChild(buildChatItem(id, true)));
        }
    });

    // ── Unfiled section ──
    if (unfiled.length > 0) {
        if (hasFolders) {
            const unfiledCollapsed = collapsedFolders.has('__unfiled__') && !query;
            const unfiledHeader = document.createElement('div');
            unfiledHeader.className = 'flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-white/5 transition-colors mt-0.5';
            unfiledHeader.onclick = () => {
                if (unfiledCollapsed) collapsedFolders.delete('__unfiled__');
                else collapsedFolders.add('__unfiled__');
                renderChatList();
            };
            unfiledHeader.innerHTML = `
                <i class="fas fa-chevron-right text-slate-400 transition-transform duration-150 ${unfiledCollapsed ? '' : 'rotate-90'}" style="font-size:9px;width:10px;flex-shrink:0"></i>
                <i class="fas fa-inbox text-slate-400" style="font-size:12px;flex-shrink:0"></i>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 flex-1">Unfiled</span>
                <span class="text-[10px] text-slate-400 font-medium">${unfiled.length}</span>
            `;
            fragment.appendChild(unfiledHeader);
            if (!unfiledCollapsed) {
                unfiled.forEach(id => fragment.appendChild(buildChatItem(id, true)));
            }
        } else {
            // No folders yet — flat list, original behavior
            unfiled.forEach(id => fragment.appendChild(buildChatItem(id, false)));
        }
    }

    DOM.chatList.innerHTML = '';
    DOM.chatList.appendChild(fragment);
}

function buildChatItem(id, indented) {
    const chat = state.chats[id];
    const isSelected = id === state.currentChatId;
    const div = document.createElement('div');
    div.className = [
        'group flex items-center justify-between rounded-xl cursor-pointer transition-all p-3',
        indented ? 'ml-4' : '',
        isSelected
            ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/5 text-brand-600 dark:text-brand-400 font-medium'
            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 border border-transparent'
    ].join(' ');
    div.onclick = () => selectChat(id);
    div.innerHTML = `
        <div class="flex items-center gap-2.5 overflow-hidden min-w-0">
            <i class="fas fa-message flex-shrink-0 opacity-60" style="font-size:11px"></i>
            <span class="truncate text-sm">${escapeHtml(chat.title)}</span>
        </div>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
            <button onclick="showFolderPicker('${id}',event)" title="Move to folder" class="p-1.5 rounded text-slate-400 hover:text-brand-500 bg-slate-50 dark:bg-slate-700/50 transition-colors"><i class="fas fa-folder-plus" style="font-size:9px"></i></button>
            <button onclick="renameChat('${id}',event)" title="Rename" class="p-1.5 rounded text-slate-400 hover:text-brand-500 bg-slate-50 dark:bg-slate-700/50 transition-colors"><i class="fas fa-pen" style="font-size:10px"></i></button>
            <button onclick="deleteChat('${id}',event)" title="Delete" class="p-1.5 rounded text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-700/50 transition-colors"><i class="fas fa-trash" style="font-size:10px"></i></button>
        </div>
    `;
    return div;
}

function renderChat(id) {
    const chat = state.chats[id];
    DOM.currentChatTitle.textContent = chat.title;
    DOM.chatWindow.innerHTML = '';
    if (chat.messages.length === 0) {
        DOM.chatFooter.classList.add('input-centered');
        DOM.welcomeHeadline.classList.remove('hidden');
    } else {
        DOM.chatFooter.classList.remove('input-centered');
        DOM.welcomeHeadline.classList.add('hidden');
        chat.messages.forEach(msg => appendMessageUI(msg.role, msg.text, msg.attachment));
    }
    scrollToBottom();
    validateInput();
}

function scrollToBottom() {
    DOM.chatWindow.scrollTo({ top: DOM.chatWindow.scrollHeight, behavior: 'smooth' });
}

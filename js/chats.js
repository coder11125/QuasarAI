// --- CHAT MANAGEMENT ---
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function createNewChat(switchChat = true, folderId = null) {
    const id = generateId();
    state.chats[id] = { id, title: 'New Chat', messages: [], folderId: folderId ?? null, updatedAt: Date.now() };
    if (switchChat) {
        state.currentChatId = id;
        renderChat(id);
        closeArtifactPanel();
        if (window.innerWidth <= 768) closeMobileSidebar();
    }
    saveState(id);
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
        deleteServerChat(id);
        if (state.currentChatId === id) {
            const remaining = Object.keys(state.chats)
                .sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt);
            if (remaining.length > 0) selectChat(remaining[0]);
            else createNewChat();
        } else { renderChatList(); saveState(); }
    }
}

function clearAllChats() {
    if (confirm('Are you sure you want to permanently delete ALL chats?')) {
        const ids = Object.keys(state.chats);
        ids.forEach(id => deleteServerChat(id));
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
        saveState(id);
        renderChatList();
        if (state.currentChatId === id) DOM.currentChatTitle.textContent = newName.trim();
    }
}

// --- SERVER SYNC ---
// Syncs keys + selectedModel to the server (chats are saved individually via syncChat)
async function syncToServer() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const res = await fetch('/api/data/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                keys: state.keys,
                selectedModel: state.selectedModel,
            })
        });
        if (res.status === 401) {
            clearAuthSession();
            showAuthScreen();
            showToast('Your session has expired. Please sign in again.', 'error');
        }
    } catch (err) {
        console.warn('Failed to sync to server:', err);
    }
}

// Saves a single chat document to the server
async function syncChat(chatId) {
    const token = getAuthToken();
    if (!token) return;
    const chat = state.chats[chatId];
    if (!chat) return;
    try {
        const res = await fetch('/api/chats/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                chatId:   chat.id,
                title:    chat.title,
                messages: chat.messages,
                folderId: chat.folderId ?? null,
            })
        });
        if (res.status === 401) {
            clearAuthSession();
            showAuthScreen();
            showToast('Your session has expired. Please sign in again.', 'error');
        }
    } catch (err) {
        console.warn('Failed to sync chat:', err);
    }
}

// Syncs a folder to the server
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
        if (res.status === 401) { clearAuthSession(); showAuthScreen(); showToast('Your session has expired. Please sign in again.', 'error'); }
    } catch (err) { console.warn('Failed to sync folder:', err); }
}

// Deletes a folder from the server
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

// Deletes a single chat from the server
async function deleteServerChat(chatId) {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch('/api/chats/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ chatId })
        });
    } catch (err) {
        console.warn('Failed to delete chat from server:', err);
    }
}


async function loadFromServer() {
    const token = getAuthToken();
    if (!token) return;

    // Retry helper — cold Vercel starts can return 500 on first request
    async function fetchWithRetry(url, options, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok || res.status === 401) return res; // don't retry auth failures
                if (i < retries) await new Promise(r => setTimeout(r, 800 * (i + 1)));
            } catch (err) {
                if (i === retries) throw err;
                await new Promise(r => setTimeout(r, 800 * (i + 1)));
            }
        }
    }

    try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [dataRes, chatsRes, foldersRes] = await Promise.all([
            fetchWithRetry('/api/data/load',    { headers }),
            fetchWithRetry('/api/chats/list',   { headers }),
            fetchWithRetry('/api/folders/list', { headers }),
        ]);

        if ([dataRes, chatsRes, foldersRes].some(r => r.status === 401)) {
            clearAuthSession();
            showAuthScreen();
            showToast('Your session has expired. Please sign in again.', 'error');
            return;
        }

        // Parse whatever succeeded — don't bail if one fails
        const data        = dataRes?.ok    ? await dataRes.json()    : {};
        const chatsData   = chatsRes?.ok   ? await chatsRes.json()   : {};
        const foldersData = foldersRes?.ok ? await foldersRes.json() : {};

        // Server always wins — replace, don't merge
        if (data.keys)           state.keys          = { google: '', openai: '', anthropic: '', groq: '', openrouter: '', mistral: '', ...data.keys };
        if (data.selectedModel)  state.selectedModel = data.selectedModel;
        if (chatsData.chats)     state.chats         = Object.keys(chatsData.chats).length > 0 ? chatsData.chats : state.chats;
        if (foldersData.folders) state.folders       = foldersData.folders;

        // Save merged state locally
        localStorage.setItem('quasar_state', JSON.stringify(state));

        // Re-render UI with loaded data
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
        showToast('Could not load your data. Check your connection.', 'error');
        renderFromLocalState();
    }
}

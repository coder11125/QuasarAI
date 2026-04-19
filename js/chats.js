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

async function generateChatTitle(chatId, provider, modelId, apiKey, userText, aiText) {
    const prompt = `Summarize this conversation as a chat title in 5 to 7 words. Reply with ONLY the title — no quotes, no punctuation at the end.\n\nUser: ${userText.substring(0, 500)}\nAssistant: ${aiText.substring(0, 500)}`;
    try {
        let title = null;

        if (provider === 'google') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        } else if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
                body: JSON.stringify({ model: modelId, max_tokens: 30, messages: [{ role: 'user', content: prompt }] })
            });
            const data = await res.json();
            title = data.content?.[0]?.text?.trim();

        } else {
            let url;
            if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
            else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
            else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
            else return;
            const extraHeaders = {};
            if (provider === 'openrouter') { extraHeaders['HTTP-Referer'] = window.location.href; extraHeaders['X-Title'] = 'Quasar AI'; }
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
                body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }], max_tokens: 30, stream: false })
            });
            const data = await res.json();
            title = data.choices?.[0]?.message?.content?.trim();
        }

        if (title && state.chats[chatId]) {
            title = title.replace(/^["'`]+|["'`]+$/g, '').trim();
            if (title.length > 60) title = title.substring(0, 60);
            state.chats[chatId].title = title;
            saveState(chatId);
            renderChatList();
            if (state.currentChatId === chatId) DOM.currentChatTitle.textContent = title;
        }
    } catch (_) { /* silently keep the fallback title */ }
}

// --- SEND & API ---
DOM.chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = DOM.userInput.value.trim();
    const selected = state.selectedModel;
    if ((!text && !currentAttachment) || !selected) return;

    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) { showToast(`API Key missing for ${provider}. Please configure in Settings.`); openSettings('api'); return; }

    const userMsg = { role: 'user', text, attachment: currentAttachment };
    const isFirstMessage = state.chats[state.currentChatId].title === 'New Chat' && text;
    state.chats[state.currentChatId].messages.push(userMsg);
    state.chats[state.currentChatId].updatedAt = Date.now();

    if (isFirstMessage) {
        state.chats[state.currentChatId].title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        renderChatList();
    }

    // Clear welcome screen if still showing
    if (DOM.chatWindow.querySelector('.fa-meteor')) DOM.chatWindow.innerHTML = '';

    appendMessageUI('user', text, currentAttachment);
    DOM.userInput.value = ''; DOM.userInput.style.height = 'auto';
    DOM.removeAttachmentBtn.click();

    // Create the AI bubble immediately (empty, will fill as tokens arrive)
    const aiWrapper = appendMessageUI('ai', '', null, true); // true = streaming mode
    const aiBubble = aiWrapper.querySelector('.streaming-content');
    requestAnimationFrame(() => scrollToBottom());

    try {
        const history = state.chats[state.currentChatId].messages.slice(-12);
        const responseText = await callAIProvider(provider, modelId, apiKey, history, (partial) => {
            // Update the bubble with each new chunk
            renderStreamingContent(aiBubble, partial);
            scrollToBottom();
        });
        // Streaming done — do a final full render with markdown/artifacts
        finaliseStreamingBubble(aiWrapper, responseText);
        state.chats[state.currentChatId].messages.push({ role: 'ai', text: responseText });
        state.chats[state.currentChatId].updatedAt = Date.now();
        saveState(state.currentChatId); renderChatList();
        if (isFirstMessage) generateChatTitle(state.currentChatId, provider, modelId, apiKey, text, responseText);
    } catch (err) {
        aiWrapper.querySelector('.message-ai').innerHTML = `
            <div class="p-4 text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${escapeHtml(err.message)}</div>`;
    }
};

DOM.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!DOM.sendBtn.disabled) DOM.chatForm.dispatchEvent(new Event('submit')); }
});

// --- STREAMING AI PROVIDER ---
// onChunk(text) is called with each new text chunk as it arrives.
// Returns the full accumulated response text when complete.
async function callAIProvider(provider, modelId, apiKey, messagesHistory, onChunk) {
    let url, headers = {}, body = {};

    if (provider === 'google') {
        // Google streaming uses streamGenerateContent endpoint
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;
        headers['Content-Type'] = 'application/json';
        body.systemInstruction = { parts: [{ text: SYSTEM_PROMPT }] };

        const merged = [];
        for (const msg of messagesHistory) {
            const role = msg.role === 'ai' ? 'model' : 'user';
            const last = merged[merged.length - 1];
            if (last && last.role === role) {
                if (msg.text) last.parts.push({ text: msg.text });
            } else {
                const parts = [];
                if (msg.text) parts.push({ text: msg.text });
                if (msg.attachment) {
                    const b64 = msg.attachment.dataUrl.split(',')[1];
                    parts.push({ inlineData: { mimeType: msg.attachment.type, data: b64 } });
                }
                if (parts.length === 0) parts.push({ text: ' ' });
                merged.push({ role, parts });
            }
        }
        if (merged.length > 0 && merged[0].role !== 'user') merged.shift();
        body.contents = merged;

    } else if (provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' };
        const msgs = [];
        for (const msg of messagesHistory) {
            let content = [];
            if (msg.text) content.push({ type: 'text', text: msg.text });
            if (msg.attachment && msg.role === 'user') { const b64 = msg.attachment.dataUrl.split(',')[1]; content.push({ type: 'image', source: { type: 'base64', media_type: msg.attachment.type, data: b64 } }); }
            if (content.length === 0) continue;
            msgs.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content });
        }
        body = { model: modelId, max_tokens: 4096, system: SYSTEM_PROMPT, messages: msgs, stream: true };

    } else {
        if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
        else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if (provider === 'openrouter') { headers['HTTP-Referer'] = window.location.href; headers['X-Title'] = 'Quasar AI'; }
        const openAiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messagesHistory.map(msg => {
                const r = msg.role === 'ai' ? 'assistant' : 'user';
                if (msg.attachment && r === 'user') return { role: r, content: [{ type: 'text', text: msg.text || "Describe this image." }, { type: 'image_url', image_url: { url: msg.attachment.dataUrl } }] };
                return { role: r, content: msg.text };
            })
        ];
        body = { model: modelId, messages: openAiMessages, stream: true };
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.error?.type || `HTTP ${response.status}`);
    }

    // Parse the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') break;
            try {
                const json = JSON.parse(data);
                let chunk = '';

                if (provider === 'google') {
                    chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else if (provider === 'anthropic') {
                    if (json.type === 'content_block_delta') chunk = json.delta?.text || '';
                } else {
                    chunk = json.choices?.[0]?.delta?.content || '';
                }

                if (chunk) {
                    fullText += chunk;
                    if (onChunk) onChunk(fullText);
                }
            } catch { /* skip malformed lines */ }
        }
    }

    return fullText || 'No response.';
}

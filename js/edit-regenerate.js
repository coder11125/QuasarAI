// --- EDIT MESSAGE ---
function editMessage(messageWrapper, originalText, originalAttachment) {
    const messageBubble = messageWrapper.querySelector('.message-user');
    const messageIndex = Array.from(DOM.chatWindow.children).indexOf(messageWrapper);

    // Save original HTML for cancel
    const originalHTML = messageBubble.innerHTML;

    // Create edit form
    messageBubble.innerHTML = '';
    messageBubble.className = 'max-w-[90%] md:max-w-[75%] p-4 rounded-2xl shadow-sm message-user';
    messageBubble.style.width = 'fit-content';

    const editForm = document.createElement('div');
    editForm.className = 'space-y-3';

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full p-3 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/50 outline-none focus:border-brand-500 dark:focus:border-white/40 resize-none';
    textarea.value = originalText;
    textarea.rows = 3;
    textarea.style.minHeight = '80px';

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    // Attachment display (if exists)
    let attachmentPreview = null;
    if (originalAttachment) {
        attachmentPreview = document.createElement('div');
        attachmentPreview.className = 'flex items-center gap-2 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 px-3 py-2 rounded-lg';
        attachmentPreview.innerHTML = `
            <i class="fas fa-image text-slate-500 dark:text-white/70 text-sm"></i>
            <span class="text-xs text-slate-700 dark:text-white/80 truncate flex-1">${originalAttachment.name}</span>
            <span class="text-xs text-slate-400 dark:text-white/50">(unchanged)</span>
        `;
        editForm.appendChild(attachmentPreview);
    }

    editForm.appendChild(textarea);

    // Buttons
    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex gap-2 justify-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        messageBubble.innerHTML = originalHTML;
    };

    const saveBtn = document.createElement('button');
    saveBtn.className = 'px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-white dark:hover:bg-white/90 text-white dark:text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2';
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Save & Resend';
    saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (!newText) {
            showToast('Message cannot be empty');
            return;
        }

        // Update message in state
        const chat = state.chats[state.currentChatId];

        // Find actual index by counting messages
        let userMsgCount = 0;
        let actualIndex = -1;
        for (let i = 0; i < chat.messages.length; i++) {
            if (chat.messages[i].role === 'user' || chat.messages[i].role === 'ai') {
                if (userMsgCount === messageIndex) {
                    actualIndex = i;
                    break;
                }
                userMsgCount++;
            }
        }

        if (actualIndex === -1) {
            showToast('Error finding message');
            return;
        }

        // Update the message
        chat.messages[actualIndex].text = newText;

        // Remove all messages after this one (since we're re-sending)
        chat.messages = chat.messages.slice(0, actualIndex + 1);

        // Save state — pass chatId so the edit syncs to server even if the AI call fails
        saveState(state.currentChatId);

        // Re-render chat to show updated message
        renderChat(state.currentChatId);

        // Automatically resend to get new AI response
        const selected = state.selectedModel;
        if (!selected) {
            showToast('Please select a model');
            return;
        }

        const [provider, modelId] = selected.split('|');
        const apiKey = state.keys[provider];
        if (!apiKey) {
            showToast(`API Key missing for ${provider}`);
            return;
        }

        // Add streaming AI bubble
        const aiWrapper = appendMessageUI('ai', '', null, true);
        const aiBubble = aiWrapper.querySelector('.streaming-content');
        scrollToBottom();

        try {
            const history = chat.messages.slice(-12);
            const { text: responseText, usage } = await callAIProvider(provider, modelId, apiKey, history, (partial) => {
                renderStreamingContent(aiBubble, partial);
                scrollToBottom();
            });
            finaliseStreamingBubble(aiWrapper, responseText);
            updateTokenStatusBar(usage, modelId);
            chat.messages.push({ role: 'ai', text: responseText });
            chat.updatedAt = Date.now();
            saveState(state.currentChatId);
            renderChatList();
        } catch (err) {
            aiWrapper.querySelector('.message-ai').innerHTML = `
                <div class="p-4 text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${escapeHtml(err.message)}</div>`;
        }
    };

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    editForm.appendChild(btnGroup);

    messageBubble.appendChild(editForm);
    textarea.focus();
    textarea.style.height = textarea.scrollHeight + 'px';
}

// --- REGENERATE RESPONSE ---
async function regenerateResponse(aiMessageWrapper) {
    const messageIndex = Array.from(DOM.chatWindow.children).indexOf(aiMessageWrapper);
    const chat = state.chats[state.currentChatId];

    // Find the corresponding message in state
    let msgCount = 0;
    let actualIndex = -1;
    for (let i = 0; i < chat.messages.length; i++) {
        if (msgCount === messageIndex) {
            actualIndex = i;
            break;
        }
        msgCount++;
    }

    if (actualIndex === -1 || chat.messages[actualIndex].role !== 'ai') {
        showToast('Error: Could not find AI message');
        return;
    }

    // Check if we have a model selected
    const selected = state.selectedModel;
    if (!selected) {
        showToast('Please select a model');
        return;
    }

    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) {
        showToast(`API Key missing for ${provider}`);
        openSettings('api');
        return;
    }

    // Replace the AI message with a streaming bubble
    aiMessageWrapper.innerHTML = '';
    aiMessageWrapper.className = 'flex w-full justify-start animate-slide-in gap-2 group';
    const streamBubble = document.createElement('div');
    streamBubble.className = 'max-w-[90%] md:max-w-[80%] message-ai overflow-hidden';
    streamBubble.innerHTML = `<div class="streaming-content prose-msg" style="padding:16px 20px"></div>`;
    aiMessageWrapper.appendChild(streamBubble);
    const aiBubble = streamBubble.querySelector('.streaming-content');

    try {
        const history = chat.messages.slice(0, actualIndex);
        const { text: responseText, usage } = await callAIProvider(provider, modelId, apiKey, history, (partial) => {
            renderStreamingContent(aiBubble, partial);
            scrollToBottom();
        });
        updateTokenStatusBar(usage, modelId);
        chat.messages[actualIndex].text = responseText;
        chat.updatedAt = Date.now();
        saveState(state.currentChatId);

        renderChat(state.currentChatId);
        renderChatList();

    } catch (err) {
        aiMessageWrapper.innerHTML = `
            <div class="max-w-[80%] p-4 message-ai">
                <div class="text-red-500 text-sm flex items-center gap-2"><i class="fas fa-exclamation-triangle"></i> Error: ${escapeHtml(err.message)}</div>
            </div>`;
    }
}

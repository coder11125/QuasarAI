// --- PARSE SEGMENTS ---
function parseMessageSegments(text) {
    const segments = [];
    const re = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0, match;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const tb = text.slice(lastIndex, match.index).trim();
            if (tb) segments.push({ type: 'text', content: tb });
        }
        segments.push({ type: 'code', lang: (match[1] || 'plaintext').toLowerCase(), content: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        const ta = text.slice(lastIndex).trim();
        if (ta) segments.push({ type: 'text', content: ta });
    }
    if (segments.length === 0) segments.push({ type: 'text', content: text });
    return segments;
}

// --- ARTIFACT CARD (inline in chat) ---
function buildArtifactCard(lang, code) {
    const cardId = 'card-' + generateId();
    const icon = LANG_ICONS[lang] || 'fas fa-code';
    const langLabel = lang === 'plaintext' ? 'Code' : lang.toUpperCase();
    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);
    const lineCount = code.trim().split('\n').length;

    const card = document.createElement('div');
    card.className = 'artifact-card';
    card.id = cardId;
    // Store data safely
    card._code = code;
    card._lang = lang;

    card.innerHTML = `
        <div class="artifact-card-left">
            <div class="artifact-card-icon-wrap">
                <i class="${icon}"></i>
            </div>
            <div class="artifact-card-info">
                <span class="artifact-card-title">${langLabel}</span>
                <span class="artifact-card-meta">${lineCount} line${lineCount !== 1 ? 's' : ''}${isPreviewable ? ' · Live preview' : ''}</span>
            </div>
        </div>
        <button class="artifact-card-btn" id="${cardId}-btn" title="Open in panel">
            <i class="fas fa-arrow-up-right-from-square"></i>
            <span>Open</span>
        </button>
    `;

    // Attach click after element exists
    card.querySelector(`#${cardId}-btn`).addEventListener('click', () => {
        openArtifactPanel(card._code, card._lang);
    });

    return card;
}

// Renders plain text into the streaming bubble while tokens are arriving
function renderStreamingContent(el, text) {
    // Show plain text during streaming — fast and flicker-free
    el.textContent = text;
    // Add a blinking cursor at the end
    el.innerHTML = escapeHtml(text) + '<span class="streaming-cursor">▋</span>';
}

// Called when streaming is complete — replaces plain text with full markdown + artifact cards
function finaliseStreamingBubble(wrapper, text) {
    const bubble = wrapper.querySelector('.message-ai');
    if (!bubble) return;
    bubble.innerHTML = ''; // clear streaming content
    bubble.className = 'max-w-[90%] md:max-w-[80%] message-ai overflow-hidden';

    const segments = parseMessageSegments(text);
    let firstItem = true;
    segments.forEach((seg, idx) => {
        const isLast = idx === segments.length - 1;
        if (seg.type === 'text' && seg.content.trim()) {
            const textDiv = document.createElement('div');
            textDiv.className = 'prose-msg';
            textDiv.style.cssText = `padding: ${firstItem ? '16px' : '4px'} 20px ${isLast ? '16px' : '4px'} 20px;`;
            try { textDiv.innerHTML = marked.parse(seg.content.trimEnd()); }
            catch (e) { textDiv.textContent = seg.content; }
            textDiv.querySelectorAll('p').forEach(p => {
                p.innerHTML = p.innerHTML.replace(/(<br\s*\/?>\s*)+$/, '');
                if (!p.innerHTML.trim()) p.remove();
            });
            bubble.appendChild(textDiv);
            firstItem = false;
        } else if (seg.type === 'code') {
            const card = buildArtifactCard(seg.lang, seg.content);
            const t = firstItem ? '12px' : '4px';
            const b = isLast ? '12px' : '4px';
            card.style.margin = `${t} 12px ${b} 12px`;
            bubble.appendChild(card);
            firstItem = false;
        }
    });

    // Update the data attribute and fix copy button to use final text
    bubble.setAttribute('data-message-text', text);
    const copyBtn = wrapper.querySelector('button[title="Copy message"]');
    if (copyBtn) {
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check text-sm text-emerald-500"></i>';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>'; }, 2000);
            }).catch(() => showToast('Failed to copy message'));
        };
    }
}

// --- MESSAGE UI ---
// streaming=true creates an empty bubble with a streaming-content div inside
function appendMessageUI(role, text, attachment = null, streaming = false) {
    if (DOM.chatWindow.querySelector('.fa-meteor.animate-pulse')) {
        DOM.chatWindow.innerHTML = '';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in gap-2 group`;

    const bubble = document.createElement('div');

    if (role === 'user') {
        bubble.className = 'max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-sm message-user break-words';
        bubble.style.width = 'fit-content';
        if (attachment) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'mb-3 max-w-[250px] rounded-lg overflow-hidden border border-white/20';
            imgDiv.innerHTML = `<img src="${escapeHtml(attachment.dataUrl)}" alt="Attachment" class="w-full h-auto object-cover" loading="lazy">`;
            bubble.appendChild(imgDiv);
        }
        const textDiv = document.createElement('div');
        textDiv.className = 'whitespace-pre-wrap text-sm md:text-base leading-relaxed';
        textDiv.style.overflowWrap = 'anywhere';
        textDiv.textContent = text;
        bubble.appendChild(textDiv);
    } else {
        bubble.className = 'max-w-[85%] md:max-w-[80%] message-ai overflow-hidden break-words';

        if (streaming) {
            // Streaming mode — just a placeholder div that renderStreamingContent will fill
            const streamDiv = document.createElement('div');
            streamDiv.className = 'streaming-content prose-msg';
            streamDiv.style.padding = '16px 20px';
            streamDiv.innerHTML = '<span class="streaming-cursor">▋</span>';
            bubble.appendChild(streamDiv);
        } else {
            const segments = parseMessageSegments(text);
            let firstItem = true;

            segments.forEach((seg, idx) => {
                const isLast = idx === segments.length - 1;
                if (seg.type === 'text' && seg.content.trim()) {
                    const textDiv = document.createElement('div');
                    textDiv.className = 'prose-msg';
                    textDiv.style.cssText = `padding: ${firstItem ? '16px' : '4px'} 20px ${isLast ? '16px' : '4px'} 20px;`;
                    try { textDiv.innerHTML = marked.parse(seg.content.trimEnd()); }
                    catch (e) { textDiv.textContent = seg.content; }
                    textDiv.querySelectorAll('p').forEach(p => {
                        p.innerHTML = p.innerHTML.replace(/(<br\s*\/?>\s*)+$/, '');
                        if (!p.innerHTML.trim()) p.remove();
                    });
                    bubble.appendChild(textDiv);
                    firstItem = false;
                } else if (seg.type === 'code') {
                    const card = buildArtifactCard(seg.lang, seg.content);
                    const t = firstItem ? '12px' : '4px';
                    const b = isLast ? '12px' : '4px';
                    card.style.margin = `${t} 12px ${b} 12px`;
                    bubble.appendChild(card);
                    firstItem = false;
                }
            });
        }
    }

    bubble.setAttribute('data-message-text', text);
    wrapper.appendChild(bubble);

    // Action buttons container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex flex-col items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
    copyBtn.title = 'Copy message';
    copyBtn.type = 'button';
    copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>';
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check text-sm text-emerald-500"></i>';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy text-sm"></i>'; }, 2000);
        }).catch(() => showToast('Failed to copy message'));
    };
    btnContainer.appendChild(copyBtn);

    // Edit button (user messages only)
    if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
        editBtn.title = 'Edit message';
        editBtn.type = 'button';
        editBtn.innerHTML = '<i class="fas fa-pen text-sm"></i>';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editMessage(wrapper, text, attachment);
        };
        btnContainer.appendChild(editBtn);
    }

    // Regenerate button (AI messages only)
    if (role === 'ai') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 transition-colors';
        regenBtn.title = 'Regenerate response';
        regenBtn.type = 'button';
        regenBtn.innerHTML = '<i class="fas fa-rotate text-sm"></i>';
        regenBtn.onclick = (e) => {
            e.stopPropagation();
            regenerateResponse(wrapper);
        };
        btnContainer.appendChild(regenBtn);
    }

    wrapper.appendChild(btnContainer);
    DOM.chatWindow.appendChild(wrapper);

    clearTimeout(appendMessageUI.scrollTimeout);
    appendMessageUI.scrollTimeout = setTimeout(scrollToBottom, 0);
    return wrapper;
}

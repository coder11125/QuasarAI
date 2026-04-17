// --- MARKED CONFIGURATION ---
marked.use({
    gfm: true,        // GitHub Flavoured Markdown: tables, strikethrough, task lists
    breaks: false,    // Disable: single newlines were becoming <br> inside <p>, adding phantom height
    renderer: (() => {
        const r = new marked.Renderer();

        // Open all links in a new tab safely
        r.link = (href, title, text) =>
            `<a href="${href}" ${title ? `title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;

        // Paragraphs: strip any trailing <br> tags to prevent phantom bottom space
        r.paragraph = (text) =>
            `<p>${text.replace(/(<br\s*\/?>\s*)+$/, '')}</p>`;

        // Inline code — styled token, not a full artifact card
        r.codespan = (code) =>
            `<code class="inline-code">${code}</code>`;

        // Fenced code blocks inside prose get a styled pre/code
        // (These should have been stripped by parseMessageSegments already,
        //  but this handles any that slip through in pure-text segments)
        r.code = (code, lang) => {
            const safeLang = (lang || 'plaintext').toLowerCase();
            const icon = LANG_ICONS[safeLang] || 'fas fa-code';
            const label = safeLang === 'plaintext' ? 'Code' : safeLang.toUpperCase();
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="prose-code-block">
                    <div class="prose-code-header">
                        <span class="prose-code-lang"><i class="${icon}"></i> ${label}</span>
                        <button class="prose-code-copy" onclick="copyProseCode(this)" title="Copy">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <pre class="prose-code-pre"><code>${escaped}</code></pre>
                </div>`;
        };

        // Tables — add classes for styling
        r.table = (header, body) =>
            `<div class="prose-table-wrap"><table class="prose-table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

        // Blockquotes
        r.blockquote = (quote) =>
            `<blockquote class="prose-blockquote">${quote}</blockquote>`;

        return r;
    })()
});

// Escapes user-controlled strings before injecting into innerHTML
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Copy button for prose code blocks
function copyProseCode(btn) {
    const code = btn.closest('.prose-code-block').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
    }).catch(() => showToast('Failed to copy'));
}

// --- TOAST ---
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    const bgClass = type === 'error'
        ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        : 'bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300';
    const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full ${bgClass}`;
    toast.innerHTML = `
        <i class="fas ${iconClass} text-lg flex-shrink-0"></i>
        <p class="text-sm font-medium flex-grow">${message}</p>
        <button onclick="this.parentElement.remove()" class="text-current opacity-70 hover:opacity-100 p-1"><i class="fas fa-times"></i></button>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}

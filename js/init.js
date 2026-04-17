// --- INIT ---
function init() {
    const saved = localStorage.getItem('quasar_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            if (!state.folders) state.folders = {};
        } catch { /* corrupted localStorage — start fresh */ }
    }

    // Apply theme immediately so there's no flash
    if (state.theme === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }

    if (window.innerWidth > 768 && state.sidebarCollapsed) {
        DOM.sidebar.classList.add('sidebar-collapsed');
    }

    setupModelDropdown();
    setupResizeHandle();
    setupSearchInput();
    setupSpeechRecognition();

    // Show a loading placeholder in the chat window while auth resolves
    DOM.chatWindow.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-40">
            <i class="fas fa-circle-notch fa-spin text-brand-500 text-3xl mb-4"></i>
            <p class="text-sm text-slate-500">Loading…</p>
        </div>`;

    // Auth check — this will call loadFromServer() which renders everything fresh
    checkAuthOnLoad();
}

init();

// --- THEME ---
function setTheme(theme) {
    state.theme = theme;
    if (theme === 'dark') DOM.html.classList.add('dark');
    else DOM.html.classList.remove('dark');
    saveState();
}
DOM.themeToggleBtn.onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

// --- SIDEBAR ---
DOM.toggleSidebarBtn.onclick = () => {
    if (window.innerWidth <= 768) {
        DOM.sidebar.classList.add('sidebar-open-mobile');
        DOM.mobileOverlay.classList.remove('hidden');
    } else {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        DOM.sidebar.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
        saveState();
    }
};
function closeMobileSidebar() {
    DOM.sidebar.classList.remove('sidebar-open-mobile');
    DOM.mobileOverlay.classList.add('hidden');
}
DOM.closeSidebarBtnMobile.onclick = closeMobileSidebar;
DOM.mobileOverlay.onclick = closeMobileSidebar;

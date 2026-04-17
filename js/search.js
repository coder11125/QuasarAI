// --- CHAT SEARCH & FILTERING ---
function getSearchableText(chat) {
    const titleText = chat.title.toLowerCase();
    const firstMessageText = chat.messages.length > 0
        ? chat.messages[0].text.toLowerCase().substring(0, 100)
        : '';
    return `${titleText} ${firstMessageText}`;
}

function filterChats(query) {
    state.searchQuery = query.toLowerCase();
    renderChatList();
}

// --- SEARCH INPUT SETUP ---
function setupSearchInput() {
    DOM.chatSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        filterChats(query);
    });
}

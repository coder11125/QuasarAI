// --- MODEL DROPDOWN ---
function setupModelDropdown() {
    if (!DOM.modelDropdownBtn || !DOM.modelDropdownMenu) return;
    DOM.modelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = DOM.modelDropdownMenu.classList.toggle('hidden');
        if (!isHidden) {
            // Reposition: if the button is near the left edge (mobile), align menu to left;
            // if near right edge, align to right so it doesn't clip off screen.
            const btnRect = DOM.modelDropdownBtn.getBoundingClientRect();
            const menuWidth = 260;
            if (btnRect.left + menuWidth > window.innerWidth - 8) {
                DOM.modelDropdownMenu.style.left = 'auto';
                DOM.modelDropdownMenu.style.right = '0';
            } else {
                DOM.modelDropdownMenu.style.left = '0';
                DOM.modelDropdownMenu.style.right = 'auto';
            }
        }
    });
    document.addEventListener('click', () => { DOM.modelDropdownMenu.classList.add('hidden'); });
    DOM.modelDropdownMenu.addEventListener('click', (e) => { e.stopPropagation(); });
}

function selectModel(providerKey, modelId) {
    state.selectedModel = `${providerKey}|${modelId}`;
    DOM.modelDropdownLabel.textContent = modelId.split('/').pop();
    DOM.modelDropdownMenu.classList.add('hidden');
    if (DOM.modelSelect) DOM.modelSelect.value = state.selectedModel;
    DOM.modelDropdownMenu.querySelectorAll('.model-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-model-id') === state.selectedModel);
    });
    saveState();
    validateInput();
}

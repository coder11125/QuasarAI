// --- INPUT ---
DOM.userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 192) + 'px';
    validateInput();
});
function validateInput() {
    const hasText = DOM.userInput.value.trim().length > 0;
    const hasFile = !!currentAttachment;
    const hasModel = !!DOM.modelSelect.value;
    DOM.sendBtn.disabled = !((hasText || hasFile) && hasModel);
}
DOM.modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
    saveState();
    validateInput();
});

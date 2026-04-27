// --- FILE & VOICE ---
DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        currentAttachment = null;
        DOM.attachmentName.textContent = file.name;
        document.getElementById('attachmentChoiceBtns').classList.remove('hidden');
        DOM.removeAttachmentBtn.classList.add('hidden');
        DOM.attachmentPreview.classList.remove('hidden');
        validateInput();

        document.getElementById('attachSendAsImageBtn').onclick = () => {
            currentAttachment = { dataUrl, type: file.type, name: file.name };
            document.getElementById('attachmentChoiceBtns').classList.add('hidden');
            DOM.removeAttachmentBtn.classList.remove('hidden');
            validateInput();
        };

        document.getElementById('attachExtractTextBtn').onclick = async () => {
            DOM.attachmentPreview.classList.add('hidden');
            DOM.fileInput.value = '';
            await runOcr(file, dataUrl);
        };
    };
    reader.readAsDataURL(file);
});

DOM.removeAttachmentBtn.onclick = () => {
    currentAttachment = null;
    DOM.fileInput.value = '';
    DOM.attachmentPreview.classList.add('hidden');
    validateInput();
};

function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { DOM.voiceBtn.style.display = 'none'; return; }
    const recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true;
    recognition.lang = 'en-US'; recognition.maxAlternatives = 1;
    let isRecording = false;
    recognition.onstart = () => { isRecording = true; DOM.voiceBtn.classList.add('text-red-500', 'animate-pulse'); showToast('🎤 Listening...', 'success'); };
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) DOM.userInput.value += (DOM.userInput.value ? ' ' : '') + event.results[i][0].transcript;
        }
        validateInput(); DOM.userInput.dispatchEvent(new Event('input'));
    };
    recognition.onerror = (event) => {
        const msgs = { 'no-speech': '❌ No speech detected.', 'audio-capture': '❌ No microphone found.', 'network': '❌ Network error.', 'not-allowed': '❌ Microphone denied.' };
        showToast(msgs[event.error] || `❌ Error: ${event.error}`); stopRec();
    };
    recognition.onend = () => stopRec();
    function stopRec() { isRecording = false; DOM.voiceBtn.classList.remove('text-red-500', 'animate-pulse'); }
    DOM.voiceBtn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isRecording) recognition.stop();
        else { try { recognition.start(); } catch (err) { showToast('❌ Failed to start microphone'); } }
    };
}

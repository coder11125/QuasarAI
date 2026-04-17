// =============================================
// OCR FEATURE
// =============================================

const ocrDOM = {
    get btn()          { return document.getElementById('ocrBtn'); },
    get fileInput()    { return document.getElementById('ocrFileInput'); },
    get modal()        { return document.getElementById('ocrModal'); },
    get loading()      { return document.getElementById('ocrLoading'); },
    get content()      { return document.getElementById('ocrContent'); },
    get errorEl()      { return document.getElementById('ocrError'); },
    get errorMsg()     { return document.getElementById('ocrErrorMsg'); },
    get previewImg()   { return document.getElementById('ocrPreviewImg'); },
    get resultText()   { return document.getElementById('ocrResultText'); },
    get insertBtn()    { return document.getElementById('ocrInsertBtn'); },
};

function openOcrModal() {
    ocrDOM.modal.classList.replace('hidden', 'flex');
}

function closeOcrModal() {
    ocrDOM.modal.classList.replace('flex', 'hidden');
    // Reset all states
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.insertBtn.classList.add('hidden');
    ocrDOM.previewImg.src = '';
    ocrDOM.resultText.value = '';
    ocrDOM.fileInput.value = '';
}

function insertOcrText() {
    const text = ocrDOM.resultText.value.trim();
    if (!text) return;
    const input = DOM.userInput;
    const existing = input.value;
    input.value = existing ? existing + '\n\n' + text : text;
    input.dispatchEvent(new Event('input'));
    input.focus();
    closeOcrModal();
    showToast('Text inserted into chat!', 'success');
}

function showOcrLoading(dataUrl) {
    ocrDOM.loading.classList.remove('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.insertBtn.classList.add('hidden');
    ocrDOM.previewImg.src = dataUrl;
}

function showOcrResult(text) {
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.errorEl.classList.add('hidden');
    ocrDOM.content.classList.remove('hidden');
    ocrDOM.content.style.display = 'flex';
    ocrDOM.resultText.value = text;
    ocrDOM.insertBtn.classList.remove('hidden');
}

function showOcrError(message) {
    ocrDOM.loading.classList.add('hidden');
    ocrDOM.content.classList.add('hidden');
    ocrDOM.errorEl.classList.remove('hidden');
    ocrDOM.errorEl.style.display = 'flex';
    ocrDOM.errorMsg.textContent = message;
}

async function runOcr(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        openOcrModal();
        showOcrLoading(dataUrl);

        const selected = state.selectedModel;
        if (!selected) {
            showOcrError('No model selected. Please choose a model first.');
            return;
        }

        const [provider, modelId] = selected.split('|');
        const apiKey = state.keys[provider];
        if (!apiKey) {
            showOcrError(`API key missing for ${DEFAULT_PROVIDERS[provider]?.name || provider}. Configure it in Settings.`);
            return;
        }

        const ocrPrompt = 'Please extract ALL text from this image exactly as it appears, preserving the original formatting, line breaks, and layout as much as possible. Output only the extracted text with no commentary or explanation.';
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/png';

        // For Groq, only a small set of models support vision — everything else is text-only
        if (provider === 'groq') {
            const GROQ_VISION_MODELS = ['llava', 'vision'];
            const supportsVision = GROQ_VISION_MODELS.some(v => modelId.toLowerCase().includes(v));
            if (!supportsVision) {
                showOcrError(`Groq model "${modelId.split('/').pop()}" is text-only and does not support image input. Please switch to a vision-capable model such as claude-3-5-sonnet, gpt-4o, or gemini-1.5-pro.`);
                return;
            }
        }
        // General blocklist for obviously non-vision models on other providers
        const NON_VISION_PATTERNS = [/whisper/i, /tts/i, /embedding/i, /davinci/i, /babbage/i, /curie/i, /ada/i];
        if (NON_VISION_PATTERNS.some(p => p.test(modelId))) {
            showOcrError(`The selected model "${modelId.split('/').pop()}" does not support image input. Please switch to a vision-capable model (e.g. claude-3-5-sonnet, gpt-4o, gemini-1.5-pro) and try again.`);
            return;
        }

        try {
            let extractedText = '';

            if (provider === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        max_tokens: 4096,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                                { type: 'text', text: ocrPrompt }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.content?.[0]?.text || '';

            } else if (provider === 'google') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType, data: base64 } },
                                { text: ocrPrompt }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            } else {
                // OpenAI-compatible (openai, groq, openrouter)
                let url = '';
                if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
                else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
                else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
                const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
                if (provider === 'openrouter') { headers['HTTP-Referer'] = window.location.href; headers['X-Title'] = 'Quasar AI'; }
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: ocrPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }]
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
                extractedText = data.choices?.[0]?.message?.content || '';
            }

            if (!extractedText.trim()) {
                showOcrResult('(No text detected in this image)');
            } else {
                showOcrResult(extractedText);
            }

        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('content must be a string') || msg.includes('does not support') || msg.includes('multimodal')) {
                showOcrError("The selected model '" + modelId.split('/').pop() + "' does not support image input. Please switch to a vision-capable model (e.g. claude-3-5-sonnet, gpt-4o, gemini-1.5-pro).");
            } else {
                showOcrError('OCR failed: ' + msg);
            }
        }
    };
    reader.readAsDataURL(file);
}

// Wire up OCR button and file input
document.getElementById('ocrBtn').addEventListener('click', () => {
    document.getElementById('ocrFileInput').click();
});
document.getElementById('ocrFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) runOcr(file);
});

// Close OCR modal on backdrop click
document.getElementById('ocrModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('ocrModal')) closeOcrModal();
});

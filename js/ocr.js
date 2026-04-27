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

function deduplicateOcrText(text) {
    const lines = text.split('\n').map(l => l.trimEnd());
    const n = lines.length;
    if (n < 6) return text;

    // Find the smallest repeating period that accounts for ≥80% of lines
    for (let period = 1; period <= Math.floor(n / 3); period++) {
        const pattern = lines.slice(0, period);
        let matches = period;
        for (let i = period; i < n; i++) {
            if (lines[i] === '' || lines[i] === pattern[i % period]) matches++;
            else break;
        }
        if (matches >= n * 0.8 && matches >= period * 2) {
            return pattern.join('\n').trimEnd();
        }
    }
    return text;
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

function modelSupportsVision(provider, modelId) {
    const m = modelId.toLowerCase();
    switch (provider) {
        case 'anthropic':
            // claude-3 and claude-4 families support vision; claude-2 and claude-instant do not
            return /claude-[34]/.test(m);
        case 'google':
            // gemini-1.5+, gemini-2+, and any model with "vision" in the name
            // gemini-1.0-pro (text-only) is excluded
            return /gemini-1\.[5-9]|gemini-[2-9]|gemini.*flash|gemini.*vision/.test(m);
        case 'openai':
            // gpt-4o, gpt-4-turbo, gpt-4-vision, gpt-4.5, o1, o3 — not gpt-3.5 or legacy gpt-4
            return /gpt-4o|gpt-4-turbo|gpt-4-vision|gpt-4\.5|^o1|^o3/.test(m);
        case 'groq':
            // llava, llama-3.2 vision variants (11b/90b), llama-4
            return /llava|llama-3\.2.*(11b|90b)|llama-4|vision/.test(m);
        case 'mistral':
            // only the pixtral family supports vision
            return /pixtral/.test(m);
        case 'openrouter':
            // openrouter proxies many providers — match known vision-capable families
            return /gpt-4o|gpt-4-turbo|gpt-4-vision|gpt-4\.5|claude-[34]|gemini-1\.[5-9]|gemini-[2-9]|gemini.*flash|llava|llama-3\.2.*(11b|90b)|llama-4|pixtral|qwen.*vl|internvl|phi.*vision|moondream|minicpm.*v|idefics|cogvlm|bakllava/.test(m);
        default:
            return false;
    }
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

        const ocrPrompt = 'Extract the foreground/main text from this image exactly as it appears. Output each piece of text only once — do not repeat any line or phrase even if it appears as a pattern or watermark in the background. If text repeats in the image, write it a single time only. Output only the extracted text with no commentary or explanation.';
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/png';

        if (!modelSupportsVision(provider, modelId)) {
            showOcrError(`"${modelId.split('/').pop()}" does not support image input. Please switch to a vision-capable model (e.g. claude-3-5-sonnet, gpt-4o, gemini-1.5-flash, pixtral-12b).`);
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
                // OpenAI-compatible (openai, groq, openrouter, mistral)
                let url = '';
                if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
                else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
                else if (provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
                else if (provider === 'mistral') url = 'https://api.mistral.ai/v1/chat/completions';
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
                showOcrResult(deduplicateOcrText(extractedText));
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

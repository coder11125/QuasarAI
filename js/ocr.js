// --- OCR ---

function modelSupportsVision(provider, modelId) {
    const m = modelId.toLowerCase();
    switch (provider) {
        case 'anthropic':
            return /claude-[34]/.test(m);
        case 'google':
            return /gemini-1\.[5-9]|gemini-[2-9]|gemini.*flash|gemini.*vision/.test(m);
        case 'openai':
            return /gpt-4o|gpt-4-turbo|gpt-4-vision|gpt-4\.5|^o1|^o3/.test(m);
        case 'groq':
            return /llava|llama-3\.2.*(11b|90b)|llama-4|vision/.test(m);
        case 'mistral':
            return /pixtral/.test(m);
        case 'openrouter':
            return /gpt-4o|gpt-4-turbo|gpt-4-vision|gpt-4\.5|claude-[34]|gemini-1\.[5-9]|gemini-[2-9]|gemini.*flash|llava|llama-3\.2.*(11b|90b)|llama-4|pixtral|qwen.*vl|internvl|phi.*vision|moondream|minicpm.*v|idefics|cogvlm|bakllava/.test(m);
        default:
            return false;
    }
}

function deduplicateOcrText(text) {
    const lines = text.split('\n').map(l => l.trimEnd());
    const n = lines.length;
    if (n < 6) return text;

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

async function runOcr(file, dataUrl) {
    const selected = state.selectedModel;
    if (!selected) {
        showToast('No model selected. Please choose a model first.');
        return;
    }

    const [provider, modelId] = selected.split('|');
    const apiKey = state.keys[provider];
    if (!apiKey) {
        showToast(`API key missing for ${DEFAULT_PROVIDERS[provider]?.name || provider}. Configure it in Settings.`);
        return;
    }

    if (!modelSupportsVision(provider, modelId)) {
        showToast(`"${modelId.split('/').pop()}" doesn't support image input. Switch to a vision-capable model (e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-flash).`);
        return;
    }

    showToast('Extracting text…', 'success');

    const ocrPrompt = 'Extract the foreground/main text from this image exactly as it appears. Output each piece of text only once — do not repeat any line or phrase even if it appears as a pattern or watermark in the background. If text repeats in the image, write it a single time only. Output only the extracted text with no commentary or explanation.';
    const base64 = dataUrl.split(',')[1];
    const mimeType = file.type || 'image/png';

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
                    model: modelId, max_tokens: 4096,
                    messages: [{ role: 'user', content: [
                        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                        { type: 'text', text: ocrPrompt }
                    ]}]
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
                    contents: [{ role: 'user', parts: [
                        { inlineData: { mimeType, data: base64 } },
                        { text: ocrPrompt }
                    ]}]
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
            extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        } else {
            const urls = {
                openai: 'https://api.openai.com/v1/chat/completions',
                groq: 'https://api.groq.com/openai/v1/chat/completions',
                openrouter: 'https://openrouter.ai/api/v1/chat/completions',
                mistral: 'https://api.mistral.ai/v1/chat/completions'
            };
            const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
            if (provider === 'openrouter') { headers['HTTP-Referer'] = window.location.href; headers['X-Title'] = 'Quasar AI'; }
            const res = await fetch(urls[provider], {
                method: 'POST', headers,
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: [
                        { type: 'text', text: ocrPrompt },
                        { type: 'image_url', image_url: { url: dataUrl } }
                    ]}]
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
            extractedText = data.choices?.[0]?.message?.content || '';
        }

        if (!extractedText.trim()) {
            showToast('No text detected in this image.');
        } else {
            const text = deduplicateOcrText(extractedText);
            const input = DOM.userInput;
            input.value = input.value ? input.value + '\n\n' + text : text;
            input.dispatchEvent(new Event('input'));
            input.focus();
            validateInput();
            showToast('Text extracted and inserted!', 'success');
        }
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('content must be a string') || msg.includes('does not support') || msg.includes('multimodal')) {
            showToast(`"${modelId.split('/').pop()}" doesn't support image input. Switch to a vision-capable model.`);
        } else {
            showToast('OCR failed: ' + msg);
        }
    }
}

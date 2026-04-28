// --- TEXT-TO-SPEECH ---
const _tts = {
    speakingBtn: null,
};

function ttsGetPlainText(text) {
    return parseMessageSegments(text)
        .filter(s => s.type === 'text')
        .map(s => s.content)
        .join(' ')
        .trim();
}

function ttsGetVoices() {
    return new Promise(resolve => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length) { resolve(voices); return; }
        const handler = () => {
            window.speechSynthesis.onvoiceschanged = null;
            resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.onvoiceschanged = handler;
        // Fallback for browsers that never fire onvoiceschanged
        setTimeout(() => {
            if (window.speechSynthesis.onvoiceschanged === handler) {
                window.speechSynthesis.onvoiceschanged = null;
                resolve(window.speechSynthesis.getVoices());
            }
        }, 1000);
    });
}

function ttsSpeak(text, btn) {
    if (!('speechSynthesis' in window)) {
        showToast('Text-to-speech is not supported in this browser.');
        return;
    }

    if (_tts.speakingBtn === btn && window.speechSynthesis.speaking) {
        ttsStop();
        return;
    }

    const wasSpeaking = window.speechSynthesis.speaking;
    ttsStop();

    const plain = ttsGetPlainText(text);
    if (!plain) return;

    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate  = state.tts?.rate  ?? 1;
    utterance.pitch = state.tts?.pitch ?? 1;

    utterance.onstart = () => {
        _tts.speakingBtn = btn;
        btn.innerHTML = '<i class="fas fa-stop text-sm"></i>';
        btn.classList.add('tts-speaking');
        btn.title = 'Stop speaking';
    };

    const reset = () => {
        if (_tts.speakingBtn === btn) {
            btn.innerHTML = '<i class="fas fa-volume-up text-sm"></i>';
            btn.classList.remove('tts-speaking');
            btn.title = 'Speak message';
            _tts.speakingBtn = null;
        }
    };

    utterance.onend  = reset;
    utterance.onerror = reset;

    const savedVoice = state.tts?.voice;
    if (savedVoice) {
        const match = window.speechSynthesis.getVoices().find(v => v.name === savedVoice);
        if (match) utterance.voice = match;
    }
    // Chrome drops speak() when called immediately after cancel(). Safari requires speak()
    // to stay synchronous (user gesture). Only defer when we actually cancelled something.
    if (wasSpeaking) {
        setTimeout(() => window.speechSynthesis.speak(utterance), 100);
    } else {
        window.speechSynthesis.speak(utterance);
    }
}

function ttsStop() {
    window.speechSynthesis.cancel();
    if (_tts.speakingBtn) {
        _tts.speakingBtn.innerHTML = '<i class="fas fa-volume-up text-sm"></i>';
        _tts.speakingBtn.classList.remove('tts-speaking');
        _tts.speakingBtn.title = 'Speak message';
        _tts.speakingBtn = null;
    }
}

function ttsPopulateVoices(selectEl, voices) {
    const current = state.tts?.voice || '';
    selectEl.innerHTML = '<option value="">Default</option>';
    voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        if (current === v.name) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

function ttsRenderSettings(container) {
    if (!('speechSynthesis' in window)) {
        container.innerHTML = '<p class="text-sm text-slate-500">Text-to-speech is not supported in this browser.</p>';
        return;
    }

    const s = state.tts || { voice: '', rate: 1, pitch: 1 };

    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Voice</label>
                <select id="ttsVoiceSelect" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-brand-500 focus:ring-1 ring-brand-500">
                    <option value="">Loading voices…</option>
                </select>
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Speed &nbsp;<span id="ttsRateLabel" class="text-brand-500 font-mono">${s.rate}x</span></label>
                <input type="range" id="ttsRateRange" min="0.5" max="2" step="0.1" value="${s.rate}" class="w-full accent-brand-500">
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Pitch &nbsp;<span id="ttsPitchLabel" class="text-brand-500 font-mono">${s.pitch}</span></label>
                <input type="range" id="ttsPitchRange" min="0.5" max="2" step="0.1" value="${s.pitch}" class="w-full accent-brand-500">
            </div>
            <button id="ttsTestBtn" class="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2">
                <i class="fas fa-play"></i> Test Voice
            </button>
        </div>
    `;

    const voiceSel   = container.querySelector('#ttsVoiceSelect');
    const rateRange  = container.querySelector('#ttsRateRange');
    const pitchRange = container.querySelector('#ttsPitchRange');
    const rateLabel  = container.querySelector('#ttsRateLabel');
    const pitchLabel = container.querySelector('#ttsPitchLabel');
    const testBtn    = container.querySelector('#ttsTestBtn');

    ttsGetVoices().then(voices => ttsPopulateVoices(voiceSel, voices));

    voiceSel.onchange = () => {
        if (!state.tts) state.tts = { voice: '', rate: 1, pitch: 1 };
        state.tts.voice = voiceSel.value;
        saveState();
    };

    rateRange.oninput = () => {
        const val = parseFloat(rateRange.value);
        rateLabel.textContent = val + 'x';
        if (!state.tts) state.tts = { voice: '', rate: 1, pitch: 1 };
        state.tts.rate = val;
        saveState();
    };

    pitchRange.oninput = () => {
        const val = parseFloat(pitchRange.value);
        pitchLabel.textContent = val;
        if (!state.tts) state.tts = { voice: '', rate: 1, pitch: 1 };
        state.tts.pitch = val;
        saveState();
    };

    testBtn.onclick = () => {
        const wasSpeaking = window.speechSynthesis.speaking;
        ttsStop();
        const doSpeak = () => {
            const u = new SpeechSynthesisUtterance('Hello! This is how I sound with the current settings.');
            u.rate  = parseFloat(rateRange.value);
            u.pitch = parseFloat(pitchRange.value);
            const match = window.speechSynthesis.getVoices().find(v => v.name === voiceSel.value);
            if (match) u.voice = match;
            window.speechSynthesis.speak(u);
        };
        // Chrome drops speak() immediately after cancel(); Safari needs it synchronous.
        if (wasSpeaking) setTimeout(doSpeak, 100); else doSpeak();
    };
}

// --- TEXT-TO-SPEECH ---
const _tts = {
    speakingBtn: null,
    voices: [],
};

// Eagerly cache voices on script load. Chrome returns [] synchronously the first time;
// `voiceschanged` fires once they're ready. Safari populates synchronously.
function _ttsLoadVoices() {
    _tts.voices = window.speechSynthesis.getVoices();
    const sel = document.getElementById('ttsVoiceSelect');
    if (sel) ttsPopulateVoices(sel);
}
if ('speechSynthesis' in window) {
    _ttsLoadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', _ttsLoadVoices);
}

function ttsGetPlainText(text) {
    if (!text) return '';
    return parseMessageSegments(text)
        .filter(s => s.type === 'text')
        .map(s => s.content)
        .join(' ')
        .trim();
}

function _ttsEnsureState() {
    if (!state.tts) state.tts = { voice: '', rate: 1, pitch: 1 };
    return state.tts;
}

function ttsSpeak(text, btn) {
    if (!('speechSynthesis' in window)) {
        showToast('Text-to-speech is not supported in this browser.');
        return;
    }

    // Toggle off when re-clicking the active button
    if (_tts.speakingBtn === btn && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        ttsStop();
        return;
    }

    const plain = ttsGetPlainText(text);
    if (!plain) {
        showToast('Nothing to speak in this message.');
        return;
    }

    const s = _ttsEnsureState();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate  = Number(s.rate)  || 1;
    utterance.pitch = Number(s.pitch) || 1;
    utterance.volume = 1;

    if (s.voice) {
        const match = _tts.voices.find(v => v.name === s.voice);
        if (match) { utterance.voice = match; utterance.lang = match.lang; }
    }

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

    const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    if (wasSpeaking) {
        // Switching from another utterance: cancel + small delay to dodge the
        // Chrome bug where speak() right after cancel() is silently dropped.
        window.speechSynthesis.cancel();
        setTimeout(() => window.speechSynthesis.speak(utterance), 250);
    } else {
        // Fresh speak: stay synchronous so Safari/iOS keeps the user gesture.
        window.speechSynthesis.speak(utterance);
    }
}

function ttsStop() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (_tts.speakingBtn) {
        _tts.speakingBtn.innerHTML = '<i class="fas fa-volume-up text-sm"></i>';
        _tts.speakingBtn.classList.remove('tts-speaking');
        _tts.speakingBtn.title = 'Speak message';
        _tts.speakingBtn = null;
    }
}

function ttsPopulateVoices(selectEl) {
    if (!selectEl) return;
    const current = state.tts?.voice || '';
    const voices = _tts.voices;
    selectEl.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = voices.length ? 'Default' : 'Loading voices…';
    selectEl.appendChild(def);
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

    const s = _ttsEnsureState();

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

    // Voices may already be cached, or may load shortly via voiceschanged.
    ttsPopulateVoices(voiceSel);
    if (!_tts.voices.length) {
        // Force a getVoices() call — some browsers need this to trigger loading.
        window.speechSynthesis.getVoices();
    }

    voiceSel.onchange = () => {
        _ttsEnsureState().voice = voiceSel.value;
        saveState();
    };

    rateRange.oninput = () => {
        const val = parseFloat(rateRange.value);
        rateLabel.textContent = val + 'x';
        _ttsEnsureState().rate = val;
        saveState();
    };

    pitchRange.oninput = () => {
        const val = parseFloat(pitchRange.value);
        pitchLabel.textContent = val;
        _ttsEnsureState().pitch = val;
        saveState();
    };

    testBtn.onclick = () => {
        const u = new SpeechSynthesisUtterance('Hello! This is how I sound with the current settings.');
        u.rate  = parseFloat(rateRange.value)  || 1;
        u.pitch = parseFloat(pitchRange.value) || 1;
        u.volume = 1;
        const match = _tts.voices.find(v => v.name === voiceSel.value);
        if (match) { u.voice = match; u.lang = match.lang; }

        const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
        if (wasSpeaking) {
            window.speechSynthesis.cancel();
            setTimeout(() => window.speechSynthesis.speak(u), 250);
        } else {
            window.speechSynthesis.speak(u);
        }
    };
}

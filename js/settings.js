// --- SETTINGS ---
function openSettings(tabId = 'general') {
    switchTab(tabId);
    renderProviderSettings();
    DOM.settingsModal.classList.replace('hidden', 'flex');
}
function closeSettings() {
    DOM.settingsModal.classList.replace('flex', 'hidden');
}
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');
    document.getElementById(`tab-content-${tabId}`).classList.remove('hidden');
}

function renderProviderSettings() {
    DOM.providerSettingsList.innerHTML = '';
    Object.keys(DEFAULT_PROVIDERS).forEach(provKey => {
        const info = DEFAULT_PROVIDERS[provKey];
        const currentKey = state.keys[provKey] || '';
        const hasModels = state.models[provKey] && state.models[provKey].length > 0;
        const div = document.createElement('div');
        div.className = "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-brand-500/30";
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i class="fas fa-microchip text-slate-400"></i> ${info.name}</h4>
                <div id="status-${provKey}" class="text-xs font-medium">
                    ${hasModels
                ? '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>'
                : '<span class="text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-white/5">Not Configured</span>'}
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 mt-1">
                <div class="relative flex-grow">
                    <input type="password" id="key-${provKey}" value="${escapeHtml(currentKey)}" placeholder="API Key" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 ring-brand-500 text-slate-800 dark:text-slate-200 transition-all font-mono">
                    <a href="${info.link}" target="_blank" class="absolute right-3 top-2.5 text-slate-400 hover:text-brand-500"><i class="fas fa-external-link-alt text-xs"></i></a>
                </div>
                <button onclick="saveAndFetch('${provKey}')" class="px-4 py-2 bg-slate-800 hover:bg-black dark:bg-brand-600 dark:hover:bg-brand-500 text-white text-sm rounded-lg font-medium transition-colors whitespace-nowrap shadow-sm flex items-center justify-center gap-2">
                    <i class="fas fa-link" id="sync-icon-${provKey}"></i> Connect
                </button>
            </div>
        `;
        DOM.providerSettingsList.appendChild(div);
    });
}

async function saveAndFetch(provider) {
    const input = document.getElementById(`key-${provider}`);
    const key = input.value.trim();
    const icon = document.getElementById(`sync-icon-${provider}`);
    const statusDiv = document.getElementById(`status-${provider}`);
    if (!key) { showToast(`Please enter an API key for ${DEFAULT_PROVIDERS[provider].name}.`); return; }
    state.keys[provider] = key;
    icon.className = 'fas fa-spinner fa-spin';

    if (provider === 'anthropic') {
        setTimeout(() => {
            state.models[provider] = ANTHROPIC_HARDCODED_MODELS;
            saveState(); updateModelSelector();
            syncToServer(); // sync immediately — don't rely on debounce
            icon.className = 'fas fa-link';
            statusDiv.innerHTML = '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>';
            showToast('Successfully connected to Anthropic.', 'success');
        }, 400);
        return;
    }

    try {
        let models = [];
        const url = DEFAULT_PROVIDERS[provider].url;
        if (provider === 'google') {
            const res = await fetch(`${url}?key=${key}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const DEPRECATED = ['vision-latest', '1.0-pro', 'ultra', 'aqa'];
            models = data.models
                .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name.replace('models/', ''))
                .filter(m => !DEPRECATED.some(d => m.includes(d)));
        } else {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` } });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            models = data.data.map(m => m.id);
        }
        state.models[provider] = models.sort();
        saveState(); updateModelSelector();
        syncToServer(); // sync immediately — don't rely on debounce
        statusDiv.innerHTML = '<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-check-circle mr-1"></i> Connected</span>';
        showToast(`Successfully connected to ${DEFAULT_PROVIDERS[provider].name}.`, 'success');
    } catch (err) {
        showToast(`Error connecting to ${escapeHtml(provider)}: ${escapeHtml(err.message)}`);
        statusDiv.innerHTML = '<span class="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800"><i class="fas fa-exclamation-circle mr-1"></i> Error</span>';
    } finally {
        icon.className = 'fas fa-link';
    }
}

function updateModelSelector() {
    if (!DOM.modelDropdownMenu || !DOM.modelSelect) return;
    DOM.modelSelect.innerHTML = '';
    let hasModels = false;
    const fragment = document.createDocumentFragment();
    Object.keys(state.models).forEach((provKey) => {
        const provModels = state.models[provKey];
        if (provModels && provModels.length > 0) {
            hasModels = true;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'model-provider-group';
            const providerLabel = document.createElement('div');
            providerLabel.className = 'model-provider-name';
            providerLabel.innerHTML = `<i class="fas fa-microchip mr-2 opacity-50"></i>${DEFAULT_PROVIDERS[provKey].name}`;
            groupDiv.appendChild(providerLabel);
            provModels.forEach((m) => {
                const modelFullId = `${provKey}|${m}`;
                const modelShortName = m.split('/').pop();
                const modelBtn = document.createElement('button');
                modelBtn.type = 'button';
                modelBtn.className = 'model-item';
                modelBtn.setAttribute('data-model-id', modelFullId);
                if (state.selectedModel === modelFullId) {
                    modelBtn.classList.add('active');
                    DOM.modelDropdownLabel.textContent = modelShortName;
                }
                modelBtn.innerHTML = `<span class="model-name-text">${escapeHtml(modelShortName)}</span><i class="fas fa-check selected-icon ml-auto opacity-0"></i>`;
                modelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); selectModel(provKey, m); };
                groupDiv.appendChild(modelBtn);
                const option = document.createElement('option');
                option.value = modelFullId; option.textContent = m;
                DOM.modelSelect.appendChild(option);
            });
            fragment.appendChild(groupDiv);
        }
    });
    DOM.modelDropdownMenu.innerHTML = '';
    if (hasModels) DOM.modelDropdownMenu.appendChild(fragment);
    else DOM.modelDropdownMenu.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No models available. Connect an API in Settings.</div>';

    if (!hasModels) DOM.modelDropdownLabel.textContent = 'No model';
    else if (!state.selectedModel) {
        const firstProv = Object.keys(state.models).find(k => state.models[k].length > 0);
        if (firstProv) selectModel(firstProv, state.models[firstProv][0]);
    } else {
        const [pk, mid] = state.selectedModel.split('|');
        DOM.modelDropdownLabel.textContent = mid.split('/').pop();
    }
    validateInput();
}

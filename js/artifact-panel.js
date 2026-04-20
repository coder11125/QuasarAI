// =============================================
// ARTIFACT SIDE PANEL
// =============================================

function openArtifactPanel(code, lang) {
    artifactPanel.open = true;
    artifactPanel.code = code;
    artifactPanel.lang = lang;
    artifactPanel.activeTab = 'code';

    const isPreviewable = PREVIEWABLE_LANGS.includes(lang);
    const icon = LANG_ICONS[lang] || 'fas fa-code';
    const langLabel = lang === 'plaintext' ? 'Code' : lang.toUpperCase();

    DOM.artifactPanelIcon.className = icon;
    DOM.artifactPanelLang.textContent = langLabel;

    // Tabs
    if (isPreviewable) {
        DOM.artifactPanelTabs.innerHTML = `
            <button class="artifact-tab active" onclick="switchPanelTab('code', this)">
                <i class="fas fa-code"></i> Code
            </button>
            <button class="artifact-tab" onclick="switchPanelTab('preview', this)">
                <i class="fas fa-eye"></i> Preview
            </button>
        `;
        DOM.artifactPanelTabs.classList.remove('hidden');
    } else {
        DOM.artifactPanelTabs.innerHTML = '';
        DOM.artifactPanelTabs.classList.add('hidden');
    }

    // Code - don't escape HTML content, let it render properly
    DOM.artifactPanelCode.textContent = code;
    DOM.artifactPanelCode.className = `artifact-code lang-${lang}`;

    // Reset panes
    DOM.artifactPanelCodePane.classList.remove('hidden');
    DOM.artifactPanelPreviewPane.classList.add('hidden');
    DOM.artifactPanelIframe.removeAttribute('srcdoc');
    DOM.artifactPanelIframe.removeAttribute('data-loaded');

    // Show panel
    DOM.artifactPanelEl.classList.remove('hidden');
    DOM.artifactPanelEl.classList.add('flex');
    DOM.resizeHandle.classList.remove('hidden');

    // Apply width
    applyPanelWidth(artifactPanel.width);

    requestAnimationFrame(() => {
        DOM.artifactPanelEl.classList.add('panel-open');
    });
}

function switchPanelTab(tab, btn) {
    DOM.artifactPanelTabs.querySelectorAll('.artifact-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    artifactPanel.activeTab = tab;

    if (tab === 'code') {
        DOM.artifactPanelCodePane.classList.remove('hidden');
        DOM.artifactPanelPreviewPane.classList.add('hidden');
    } else {
        DOM.artifactPanelCodePane.classList.add('hidden');
        DOM.artifactPanelPreviewPane.classList.remove('hidden');
        if (!DOM.artifactPanelIframe.dataset.loaded) {
            if (!confirm('This preview will execute AI-generated code in a sandboxed frame.\n\nOnly proceed if you trust the content.\n\nContinue?')) {
                // Revert to code tab
                DOM.artifactPanelTabs.querySelectorAll('.artifact-tab').forEach((t, i) => {
                    t.classList.toggle('active', i === 0);
                });
                artifactPanel.activeTab = 'code';
                DOM.artifactPanelCodePane.classList.remove('hidden');
                DOM.artifactPanelPreviewPane.classList.add('hidden');
                return;
            }
            let html = artifactPanel.code;
            if (artifactPanel.lang === 'svg') {
                html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff">${artifactPanel.code}</body></html>`;
            }
            DOM.artifactPanelIframe.srcdoc = html;
            DOM.artifactPanelIframe.dataset.loaded = '1';
        }
    }
}

function copyArtifactPanel() {
    navigator.clipboard.writeText(artifactPanel.code).then(() => {
        DOM.artifactPanelCopyBtn.innerHTML = '<i class="fas fa-check"></i>';
        DOM.artifactPanelCopyBtn.classList.add('copied');
        setTimeout(() => {
            DOM.artifactPanelCopyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            DOM.artifactPanelCopyBtn.classList.remove('copied');
        }, 2000);
        showToast('Code copied!', 'success');
    }).catch(() => showToast('Failed to copy'));
}

function closeArtifactPanel() {
    DOM.artifactPanelEl.classList.remove('panel-open');
    setTimeout(() => {
        DOM.artifactPanelEl.classList.add('hidden');
        DOM.artifactPanelEl.classList.remove('flex');
        DOM.resizeHandle.classList.add('hidden');
        DOM.artifactPanelEl.style.width = '';
        artifactPanel.open = false;
    }, 220);
}

function applyPanelWidth(pct) {
    const totalW = DOM.mainContent.offsetWidth;
    const panelW = Math.round(totalW * pct / 100);
    DOM.artifactPanelEl.style.width = panelW + 'px';
    DOM.artifactPanelEl.style.flex = 'none';
}

// --- RESIZE HANDLE ---
function setupResizeHandle() {
    const handle = DOM.resizeHandle;
    let dragging = false;
    let startX = 0;
    let startPanelW = 0;

    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX;
        startPanelW = DOM.artifactPanelEl.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        DOM.artifactPanelIframe.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = startX - e.clientX;
        const totalW = DOM.mainContent.offsetWidth;
        const newW = Math.min(Math.max(startPanelW + dx, 300), totalW * 0.75);
        DOM.artifactPanelEl.style.width = newW + 'px';
        artifactPanel.width = (newW / totalW) * 100;
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        DOM.artifactPanelIframe.style.pointerEvents = '';
    });

    // Touch
    handle.addEventListener('touchstart', (e) => {
        dragging = true;
        startX = e.touches[0].clientX;
        startPanelW = DOM.artifactPanelEl.offsetWidth;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = startX - e.touches[0].clientX;
        const totalW = DOM.mainContent.offsetWidth;
        const newW = Math.min(Math.max(startPanelW + dx, 300), totalW * 0.75);
        DOM.artifactPanelEl.style.width = newW + 'px';
        artifactPanel.width = (newW / totalW) * 100;
    }, { passive: true });
    document.addEventListener('touchend', () => { dragging = false; });
}

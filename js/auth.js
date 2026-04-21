// =============================================
// AUTH
// =============================================

function getAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getAuthUser()  {
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; }
}
function saveAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('auth-hidden');
}
function hideAuthScreen() {
    document.getElementById('authScreen').classList.add('auth-hidden');
    loadFromServer();
}

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('authLoginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('authRegisterForm').classList.toggle('hidden', isLogin);
    document.getElementById('authTabLoginBtn').className =
        `auth-tab-btn flex-1 py-3.5 text-sm font-semibold transition-all border-b-2 ${isLogin ? 'text-brand-500 border-brand-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`;
    document.getElementById('authTabRegisterBtn').className =
        `auth-tab-btn flex-1 py-3.5 text-sm font-semibold transition-all border-b-2 ${!isLogin ? 'text-brand-500 border-brand-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`;
    clearAuthError();
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    document.getElementById('authErrorMsg').textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('flex');
}
function clearAuthError() {
    const el = document.getElementById('authError');
    el.classList.add('hidden');
    el.classList.remove('flex');
}

function setAuthBtnLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Please wait…';
    } else {
        btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? '<i class="fas fa-eye-slash text-sm"></i>' : '<i class="fas fa-eye text-sm"></i>';
}

async function handleLogin() {
    clearAuthError();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) { showAuthError('Please enter your email and password.'); return; }

    setAuthBtnLoading('loginBtn', true);
    try {
        const res  = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error || 'Login failed.'); return; }

        saveAuthSession(data.token, data.user);
        hideAuthScreen();
        showToast(`Welcome back, ${data.user.email}!`, 'success');
    } catch (err) {
        showAuthError('Could not connect to server. Please try again.');
    } finally {
        setAuthBtnLoading('loginBtn', false);
    }
}

async function handleRegister() {
    clearAuthError();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm  = document.getElementById('registerConfirm').value;

    if (!email || !password) { showAuthError('Please fill in all fields.'); return; }
    if (password !== confirm) { showAuthError('Passwords do not match.'); return; }
    if (password.length < 8)  { showAuthError('Password must be at least 8 characters.'); return; }

    setAuthBtnLoading('registerBtn', true);
    try {
        const res  = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAuthError(data.error || 'Registration failed.'); return; }

        saveAuthSession(data.token, data.user);
        hideAuthScreen();
        showToast(`Account created! Welcome, ${data.user.email}!`, 'success');
    } catch (err) {
        showAuthError('Could not connect to server. Please try again.');
    } finally {
        setAuthBtnLoading('registerBtn', false);
    }
}

function handleLogout() {
    if (!confirm('Sign out of Quasar AI?')) return;
    clearAuthSession();
    // Clear local state so next login loads fresh from server
    localStorage.removeItem('quasar_state');
    state.keys = { google: '', openai: '', anthropic: '', groq: '', openrouter: '', mistral: '' };
    state.models = { google: [], openai: [], anthropic: [], groq: [], openrouter: [], mistral: [] };
    state.chats = {};
    state.folders = {};
    state.currentChatId = null;
    state.selectedModel = '';
    updateModelSelector();
    renderProviderSettings();
    showAuthScreen();
    document.getElementById('loginEmail').value    = '';
    document.getElementById('loginPassword').value = '';
    switchAuthTab('login');
    showToast('Signed out successfully.', 'success');
}

async function checkAuthOnLoad() {
    const token = getAuthToken();
    if (!token) { showAuthScreen(); return; }

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            hideAuthScreen(); // calls loadFromServer() — fresh data from MongoDB
        } else {
            clearAuthSession();
            showAuthScreen();
        }
    } catch {
        // Network error — trust the token and render from localStorage so the
        // user isn't locked out offline, but don't try to loadFromServer
        document.getElementById('authScreen').classList.add('auth-hidden');
        renderFromLocalState();
    }
}

// Renders the UI entirely from whatever is currently in state (localStorage fallback)
function renderFromLocalState() {
    renderProviderSettings();
    updateModelSelector();
    if (Object.keys(state.chats).length === 0) {
        createNewChat(false);
    } else {
        if (!state.currentChatId || !state.chats[state.currentChatId]) {
            state.currentChatId = Object.keys(state.chats)
                .sort((a, b) => state.chats[b].updatedAt - state.chats[a].updatedAt)[0];
        }
        renderChatList();
        renderChat(state.currentChatId);
    }
    if (state.selectedModel) {
        DOM.modelSelect.value = state.selectedModel;
        const [pk, mid] = state.selectedModel.split('|');
        if (pk && mid) DOM.modelDropdownLabel.textContent = mid.split('/').pop();
    }
}

// Enter key support on auth forms
document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});
document.getElementById('registerConfirm').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
});

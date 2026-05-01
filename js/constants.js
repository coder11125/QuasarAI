// --- CONSTANTS ---
const ANTHROPIC_HARDCODED_MODELS = [
    'claude-4-6-sonnet-20250219',
    'claude-4-5-sonnet-20241022',
    'claude-4-5-haiku-20241022',
    'claude-4-7-opus-20240229'
];

const DEFAULT_PROVIDERS = {
    google: { name: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/models", link: "https://aistudio.google.com/app/apikey" },
    openai: { name: "OpenAI", url: "https://api.openai.com/v1/models", link: "https://platform.openai.com/api-keys" },
    anthropic: { name: "Anthropic", url: "hardcoded", link: "https://console.anthropic.com/settings/keys" },
    groq: { name: "Groq", url: "https://api.groq.com/openai/v1/models", link: "https://console.groq.com/keys" },
    openrouter: { name: "OpenRouter", url: "https://openrouter.ai/api/v1/models", link: "https://openrouter.ai/keys" },
    mistral: { name: "Mistral", url: "https://api.mistral.ai/v1/models", link: "https://console.mistral.ai/api-keys" }
};

const LANG_ICONS = {
    // Web — markup & styles
    html:       'fab fa-html5',
    htm:        'fab fa-html5',
    css:        'fab fa-css3-alt',
    scss:       'fab fa-sass',
    sass:       'fab fa-sass',
    less:       'fab fa-less',

    // JavaScript ecosystem
    javascript: 'fab fa-js-square',
    js:         'fab fa-js-square',
    typescript: 'fab fa-js-square',   // no dedicated FA TS brand icon
    ts:         'fab fa-js-square',
    jsx:        'fab fa-react',
    tsx:        'fab fa-react',
    vue:        'fab fa-vuejs',
    svelte:     'fas fa-bolt',

    // Python
    python:     'fab fa-python',
    py:         'fab fa-python',
    ipynb:      'fab fa-python',

    // Systems / compiled
    c:          'fas fa-microchip',
    cpp:        'fas fa-microchip',
    'c++':      'fas fa-microchip',
    rust:       'fab fa-rust',
    go:         'fab fa-golang',
    java:       'fab fa-java',
    kotlin:     'fas fa-code',        // no FA 6.4 brand icon for Kotlin
    swift:      'fab fa-swift',
    dart:       'fas fa-code',
    scala:      'fas fa-code',
    wasm:       'fas fa-microchip',
    assembly:   'fas fa-microchip',
    asm:        'fas fa-microchip',

    // Shell / scripting
    bash:       'fas fa-terminal',
    sh:         'fas fa-terminal',
    shell:      'fas fa-terminal',
    zsh:        'fas fa-terminal',
    fish:       'fas fa-terminal',
    powershell: 'fas fa-terminal',
    ps1:        'fas fa-terminal',
    bat:        'fas fa-terminal',
    cmd:        'fas fa-terminal',
    makefile:   'fas fa-wrench',

    // Data / config
    json:       'fas fa-brackets-curly',
    yaml:       'fas fa-cog',
    yml:        'fas fa-cog',
    toml:       'fas fa-cog',
    ini:        'fas fa-cog',
    env:        'fas fa-key',
    xml:        'fas fa-file-code',
    csv:        'fas fa-file-csv',
    diff:       'fas fa-code-compare',
    patch:      'fas fa-code-compare',

    // Database / query
    sql:        'fas fa-database',
    graphql:    'fas fa-circle-nodes',
    gql:        'fas fa-circle-nodes',
    prisma:     'fas fa-database',

    // DevOps / infra
    dockerfile: 'fab fa-docker',
    docker:     'fab fa-docker',
    nginx:      'fas fa-server',
    terraform:  'fas fa-cloud',
    tf:         'fas fa-cloud',
    hcl:        'fas fa-cloud',

    // Docs / text
    markdown:   'fab fa-markdown',
    md:         'fab fa-markdown',
    txt:        'fas fa-file-alt',
    text:       'fas fa-file-alt',

    // Other languages
    php:        'fab fa-php',
    ruby:       'fas fa-gem',
    r:          'fas fa-chart-bar',
    lua:        'fas fa-moon',
    perl:       'fas fa-code',
    haskell:    'fas fa-infinity',
    hs:         'fas fa-infinity',
    elixir:     'fas fa-flask',
    ex:         'fas fa-flask',
    exs:        'fas fa-flask',
    solidity:   'fab fa-ethereum',
    sol:        'fab fa-ethereum',
};

const PREVIEWABLE_LANGS = ['html', 'svg'];

const SYSTEM_PROMPT = `You are Quasar AI, a helpful assistant. Follow these rules strictly:
1. ALWAYS wrap ALL code in fenced code blocks with the correct language tag. No exceptions.
   - Use \`\`\`html for HTML, \`\`\`python for Python, \`\`\`javascript for JS, \`\`\`css for CSS, etc.
   - Even single-line code snippets must use fenced code blocks, never inline backticks for code output.
   - If a response contains multiple languages, each block must be separately fenced with its own language tag.
2. Never output raw unwrapped code outside of a fenced block.
3. Never wrap your entire response in a \`\`\`markdown block. Prose must be written as plain text, not fenced.
4. Be concise, clear, and helpful.`;

const FOLDER_COLORS = {
    gray:   { dot: '#94a3b8', icon: '#94a3b8', label: '#64748b' },
    blue:   { dot: '#60a5fa', icon: '#60a5fa', label: '#3b82f6' },
    green:  { dot: '#4ade80', icon: '#4ade80', label: '#16a34a' },
    amber:  { dot: '#fbbf24', icon: '#fbbf24', label: '#d97706' },
    red:    { dot: '#f87171', icon: '#f87171', label: '#dc2626' },
    purple: { dot: '#c084fc', icon: '#c084fc', label: '#9333ea' },
    pink:   { dot: '#f472b6', icon: '#f472b6', label: '#db2777' },
    teal:   { dot: '#2dd4bf', icon: '#2dd4bf', label: '#0d9488' },
};

const AUTH_TOKEN_KEY = 'quasar_auth_token';
const AUTH_USER_KEY  = 'quasar_auth_user';

const SUMMARY_THRESHOLD = 20; // total messages before auto-summarising older context
const RECENT_KEEP       = 8;  // always send this many recent messages verbatim
const SUMMARY_REBATCH   = 4;  // only regenerate summary after this many new older messages

// Pricing in USD per 1M tokens. Omit a model to show tokens only (no cost).
// Models with label:'free' show "free" instead of a dollar amount.
const MODEL_PRICING = {
    // Anthropic
    'claude-4-7-opus-20240229':   { input: 15.00, output: 75.00 },
    'claude-4-6-sonnet-20250219': { input: 3.00,  output: 15.00 },
    'claude-4-5-sonnet-20241022': { input: 3.00,  output: 15.00 },
    'claude-4-5-haiku-20241022':  { input: 0.80,  output: 4.00  },
    // OpenAI
    'gpt-4o':                     { input: 2.50,  output: 10.00 },
    'gpt-4o-mini':                { input: 0.15,  output: 0.60  },
    'gpt-4-turbo':                { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo':              { input: 0.50,  output: 1.50  },
    'o1':                         { input: 15.00, output: 60.00 },
    'o1-mini':                    { input: 3.00,  output: 12.00 },
    'o3-mini':                    { input: 1.10,  output: 4.40  },
    // Google
    'gemini-2.5-pro-preview-05-06': { input: 1.25,  output: 10.00 },
    'gemini-2.5-flash-preview-04-17': { input: 0.15, output: 0.60 },
    'gemini-2.0-flash':           { input: 0.10,  output: 0.40  },
    'gemini-1.5-pro':             { input: 1.25,  output: 5.00  },
    'gemini-1.5-flash':           { input: 0.075, output: 0.30  },
    // Groq (free tier)
    'llama-3.3-70b-versatile':    { input: 0, output: 0, label: 'free' },
    'llama-3.1-8b-instant':       { input: 0, output: 0, label: 'free' },
    'mixtral-8x7b-32768':         { input: 0, output: 0, label: 'free' },
    'gemma2-9b-it':               { input: 0, output: 0, label: 'free' },
    // Mistral
    'mistral-large-latest':       { input: 2.00,  output: 6.00  },
    'mistral-small-latest':       { input: 0.10,  output: 0.30  },
    'open-mistral-7b':            { input: 0.25,  output: 0.25  },
};

/**
 * Nestflo HMO Market Intelligence — Chat Widget
 * Self-contained inbound chatbot with quick-reply buttons.
 * Jim-built, 2026-07-08
 *
 * Usage: <script src="/widget.js"></script>
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const SERVER = script?.getAttribute('data-server') || window.location.origin;

  // --- State ---
  let sessionId = null;
  let isOpen = false;
  let isWaiting = false;

  // --- CSS (Nestflo dark theme) ---
  const css = `
  :root {
    --nf-accent: #f97316;
    --nf-accent-hover: #ea580c;
    --nf-cyan: #22d3ee;
    --nf-bg: #050710;
    --nf-card: #0a1128;
    --nf-surface: #111b3d;
    --nf-border: rgba(255,255,255,0.08);
    --nf-text: #f1f5f9;
    --nf-text-secondary: #94a3b8;
    --nf-text-muted: #64748b;
    --nf-gradient: linear-gradient(135deg, #f97316, #06b6d4);
    --nf-shadow: 0 8px 40px rgba(0,0,0,0.4);
    --nf-radius: 16px;
    --nf-radius-sm: 10px;
    --nf-transition: 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  #nf-chat-bubble {
    position: fixed; bottom: 24px; right: 24px;
    width: 58px; height: 58px; border-radius: 50%;
    background: var(--nf-gradient);
    color: white; border: none; cursor: pointer;
    z-index: 99998;
    display: flex; align-items: center; justify-content: center;
    box-shadow: var(--nf-shadow), 0 0 24px rgba(249,115,22,0.3);
    transition: transform var(--nf-transition), opacity var(--nf-transition);
  }
  #nf-chat-bubble:hover { transform: scale(1.08); }
  #nf-chat-bubble.hidden { opacity: 0; pointer-events: none; transform: scale(0.7); }

  #nf-chat-window {
    position: fixed; bottom: 96px; right: 24px;
    width: 390px; max-width: calc(100vw - 32px);
    height: 580px; max-height: calc(100vh - 140px);
    background: var(--nf-card);
    border-radius: var(--nf-radius);
    box-shadow: var(--nf-shadow);
    border: 1px solid var(--nf-border);
    z-index: 99999;
    display: flex; flex-direction: column;
    transform-origin: bottom right;
    transition: transform var(--nf-transition), opacity var(--nf-transition);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #nf-chat-window.closed {
    transform: scale(0.9); opacity: 0; pointer-events: none;
  }

  .nf-header {
    display: flex; align-items: center; padding: 14px 16px;
    background: var(--nf-gradient); flex-shrink: 0;
  }
  .nf-header-logo {
    width: 34px; height: 34px; border-radius: 8px;
    background: white; display: flex; align-items: center;
    justify-content: center; font-weight: 700; font-size: 13px;
    color: #f97316; flex-shrink: 0;
  }
  .nf-header-info { margin-left: 12px; flex: 1; min-width: 0; }
  .nf-header-title { font-size: 15px; font-weight: 600; color: white; line-height: 1.2; }
  .nf-header-subtitle {
    font-size: 11px; color: rgba(255,255,255,0.75); line-height: 1.2; margin-top: 2px;
  }
  .nf-header-close {
    width: 30px; height: 30px; border: none; background: none; cursor: pointer;
    color: rgba(255,255,255,0.7); display: flex; align-items: center;
    justify-content: center; border-radius: 8px; font-size: 18px; flex-shrink: 0;
    transition: background var(--nf-transition);
  }
  .nf-header-close:hover { background: rgba(255,255,255,0.2); }

  .nf-messages {
    flex: 1; overflow-y: auto; padding: 14px 14px 8px;
    background: var(--nf-bg);
    display: flex; flex-direction: column; gap: 10px;
  }
  .nf-msg {
    max-width: 88%; padding: 10px 14px; border-radius: var(--nf-radius-sm);
    font-size: 13.5px; line-height: 1.6; word-break: break-word;
    animation: nf-fadeIn 0.3s ease-out; white-space: pre-line;
  }
  .nf-msg a { color: var(--nf-cyan); text-decoration: underline; }
  .nf-msg strong { font-weight: 600; }
  .nf-msg.user {
    align-self: flex-end; background: var(--nf-surface);
    color: var(--nf-text); border-bottom-right-radius: 4px;
    border: 1px solid var(--nf-border);
  }
  .nf-msg.assistant {
    align-self: flex-start; background: #182244;
    color: var(--nf-text); border-bottom-left-radius: 4px;
    border: 1px solid var(--nf-border);
  }
  .nf-msg.system {
    align-self: center; background: transparent;
    color: var(--nf-text-muted); font-size: 11.5px; padding: 4px 8px;
  }

  /* Quick Reply Buttons */
  .nf-quick-replies {
    align-self: flex-start; margin-top: -2px; margin-bottom: 4px;
    display: flex; flex-wrap: wrap; gap: 6px; max-width: 88%;
  }
  .nf-qr-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 7px 13px; border-radius: 20px; border: 1px solid var(--nf-border);
    background: var(--nf-surface); color: var(--nf-text);
    font-size: 12.5px; font-family: inherit; cursor: pointer;
    transition: all var(--nf-transition); white-space: nowrap;
  }
  .nf-qr-btn:hover { background: #1e2d52; border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
  .nf-qr-btn:active { transform: scale(0.96); }

  /* Lead capture inline form */
  .nf-lead-capture {
    align-self: flex-start; margin: -4px 0 6px; width: 88%;
  }
  .nf-lead-input {
    width: 100%; padding: 10px 14px; border-radius: 22px;
    border: 1px solid var(--nf-accent); background: var(--nf-surface);
    color: white; font-size: 13.5px; font-family: inherit; outline: none;
    box-sizing: border-box;
    transition: border-color var(--nf-transition);
  }
  .nf-lead-input:focus { border-color: var(--nf-cyan); box-shadow: 0 0 0 2px rgba(34,211,238,0.15); }
  .nf-lead-input::placeholder { color: var(--nf-text-muted); font-size: 13px; }

  .nf-typing {
    align-self: flex-start; padding: 10px 14px;
    background: #182244; border-radius: var(--nf-radius-sm);
    border: 1px solid var(--nf-border);
    display: flex; gap: 4px;
  }
  .nf-typing span {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--nf-text-muted);
    animation: nf-bounce 1.3s infinite;
  }
  .nf-typing span:nth-child(2) { animation-delay: 0.2s; }
  .nf-typing span:nth-child(3) { animation-delay: 0.4s; }

  .nf-input-area {
    padding: 10px 14px 14px; border-top: 1px solid var(--nf-border);
    background: var(--nf-card); flex-shrink: 0;
  }
  .nf-input-row { display: flex; align-items: flex-end; gap: 8px; }
  .nf-input-wrap {
    flex: 1; background: var(--nf-surface); border-radius: 24px;
    border: 1px solid var(--nf-border); display: flex;
    align-items: flex-end; padding: 4px 6px;
    transition: border-color var(--nf-transition);
  }
  .nf-input-wrap:focus-within { border-color: var(--nf-accent); }
  .nf-input-wrap textarea {
    flex: 1; border: none; background: none; outline: none; resize: none;
    font-family: inherit; font-size: 13.5px; line-height: 1.5;
    padding: 6px 10px; color: var(--nf-text); max-height: 100px; min-height: 22px;
  }
  .nf-input-wrap textarea::placeholder { color: var(--nf-text-muted); }
  .nf-send-btn {
    width: 38px; height: 38px; border: none; border-radius: 50%;
    background: var(--nf-gradient); color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: opacity var(--nf-transition), transform var(--nf-transition);
  }
  .nf-send-btn:hover { opacity: 0.9; }
  .nf-send-btn:disabled { opacity: 0.3; cursor: default; }
  .nf-send-btn:not(:disabled):active { transform: scale(0.93); }

  .nf-footer {
    text-align: center; padding: 6px 14px 8px;
    font-size: 10.5px; color: var(--nf-text-muted); flex-shrink: 0;
  }

  .nf-ext-link {
    align-self: flex-start; margin: -4px 0 4px;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 22px;
    background: var(--nf-gradient); color: white !important;
    font-size: 13px; font-weight: 600; text-decoration: none !important;
    transition: opacity var(--nf-transition), transform var(--nf-transition);
  }
  .nf-ext-link:hover { opacity: 0.9; transform: translateY(-1px); }

  @keyframes nf-fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes nf-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-7px); }
  }
  @media (max-width: 440px) {
    #nf-chat-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; }
    #nf-chat-bubble { right: 12px; bottom: 16px; }
  }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --- Build Bubble ---
  const bubble = document.createElement('button');
  bubble.id = 'nf-chat-bubble';
  bubble.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.onclick = () => toggleChat(true);
  document.body.appendChild(bubble);

  // --- Build Window ---
  const win = document.createElement('div');
  win.id = 'nf-chat-window';
  win.className = 'closed';
  win.innerHTML = `
    <div class="nf-header">
      <div class="nf-header-logo">HMI</div>
      <div class="nf-header-info">
        <div class="nf-header-title">Nestflo Assistant</div>
        <div class="nf-header-subtitle">Questions? I'm here to help</div>
      </div>
      <button class="nf-header-close" aria-label="Close">✕</button>
    </div>
    <div class="nf-messages" id="nf-messages"></div>
    <div class="nf-input-area">
      <div class="nf-input-row">
        <div class="nf-input-wrap">
          <textarea id="nf-input" rows="1" placeholder="Type a message..."></textarea>
        </div>
        <button class="nf-send-btn" id="nf-send-btn" disabled aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
    <div class="nf-footer">Powered by Nestflo</div>
  `;
  document.body.appendChild(win);

  const messagesEl = document.getElementById('nf-messages');
  const inputEl = document.getElementById('nf-input');
  const sendBtn = document.getElementById('nf-send-btn');
  const closeBtn = win.querySelector('.nf-header-close');

  // --- Helpers ---
  function toggleChat(open) {
    if (open === undefined) open = !isOpen;
    isOpen = open;
    if (open) {
      win.classList.remove('closed');
      bubble.classList.add('hidden');
      setTimeout(() => inputEl.focus(), 300);
      if (!sessionId) initSession();
    } else {
      win.classList.add('closed');
      bubble.classList.remove('hidden');
    }
  }

  async function initSession() {
    try {
      const res = await fetch(`${SERVER}/api/chatbot/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      sessionId = data.sessionId;
      addMessage('assistant', data.message, data.quickReplies, data.leadCapture, data.externalLink);
    } catch (err) {
      console.error('Chatbot init failed:', err);
      addMessage('assistant', "👋 Hi! I can help with HMO valuations. What are you looking for?");
    }
  }

  function addMessage(role, text, quickReplies, leadCapture, externalLink) {
    const div = document.createElement('div');
    div.className = `nf-msg ${role}`;
    div.innerHTML = renderMarkdown(text);
    messagesEl.appendChild(div);

    if (externalLink) {
      const linkBtn = document.createElement('a');
      linkBtn.className = 'nf-ext-link';
      linkBtn.href = externalLink;
      linkBtn.target = '_blank';
      linkBtn.rel = 'noopener noreferrer';
      linkBtn.textContent = 'Open →';
      messagesEl.appendChild(linkBtn);
    }

    if (leadCapture) {
      addLeadCaptureField(leadCapture);
    }
    if (quickReplies && quickReplies.length > 0) {
      addQuickReplies(quickReplies);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMarkdown(text) {
    // Bold: **text**
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return html;
  }

  function addQuickReplies(replies) {
    const qrDiv = document.createElement('div');
    qrDiv.className = 'nf-quick-replies';
    replies.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'nf-qr-btn';
      btn.textContent = r.label;
      btn.onclick = () => sendQuickReply(r.value, r.label);
      qrDiv.appendChild(btn);
    });
    messagesEl.appendChild(qrDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addLeadCaptureField(capture) {
    const existing = document.querySelector('.nf-lead-capture');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'nf-lead-capture';
    const input = document.createElement('input');
    input.className = 'nf-lead-input';
    input.type = capture.field === 'email' ? 'email' : capture.field === 'phone' ? 'tel' : 'text';
    input.placeholder = capture.field === 'name' ? 'Your name...'
      : capture.field === 'email' ? 'you@company.com'
      : 'Phone number (optional)...';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const val = input.value.trim();
        removeLeadCapture();
        sendQuickReply(val, val);
      }
    });
    div.appendChild(input);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(() => input.focus(), 150);
  }

  function removeLeadCapture() {
    const el = document.querySelector('.nf-lead-capture');
    if (el) el.remove();
  }

  async function sendQuickReply(value, label) {
    if (isWaiting) return;
    removeQuickReplies();
    removeLeadCapture();
    addMessage('user', label);
    isWaiting = true;
    showTyping();

    try {
      const res = await fetch(`${SERVER}/api/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: value }),
      });
      const data = await res.json();
      hideTyping();
      isWaiting = false;
      addMessage('assistant', data.message, data.quickReplies, data.leadCapture, data.externalLink);

      if (data.leadCaptured) {
        sendLeadToBackend();
      }
    } catch (err) {
      console.error('Chatbot message failed:', err);
      hideTyping();
      isWaiting = false;
      addMessage('system', '⚠️ Something went wrong. Please try again.');
    }
  }

  async function sendLeadToBackend() {
    // Lead is already saved server-side via chatbot.py.
    // This is a no-op — server persisted it when processing bespoke_phone → bespoke_done.
  }

  function removeQuickReplies() {
    const qrs = messagesEl.querySelectorAll('.nf-quick-replies');
    qrs.forEach(el => el.remove());
  }

  function showTyping() {
    removeQuickReplies();
    removeLeadCapture();
    const el = document.createElement('div');
    el.className = 'nf-typing';
    el.id = 'nf-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('nf-typing');
    if (el) el.remove();
  }

  function updateSendBtn() {
    sendBtn.disabled = !inputEl.value.trim() || isWaiting;
  }

  // --- Event Listeners ---
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    updateSendBtn();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputEl.value.trim()) {
        const val = inputEl.value.trim();
        inputEl.value = '';
        inputEl.style.height = 'auto';
        updateSendBtn();
        if (sessionId) {
          removeQuickReplies();
          removeLeadCapture();
          sendQuickReply(val, val);
        }
      }
    }
  });

  sendBtn.addEventListener('click', () => {
    if (inputEl.value.trim()) {
      const val = inputEl.value.trim();
      inputEl.value = '';
      inputEl.style.height = 'auto';
      updateSendBtn();
      if (sessionId) {
        removeQuickReplies();
        removeLeadCapture();
        sendQuickReply(val, val);
      }
    }
  });

  closeBtn.addEventListener('click', () => toggleChat(false));

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggleChat(false);
  });
})();

/**
 * HMO Market Intelligence Chat Widget — embeddable inbound chatbot
 * Powered by Talon 🦅
 *
 * Usage: <script src="https://hmo-market-intelligence.co.uk/widget.js" data-server="https://hmo-market-intelligence.co.uk"></script>
 */

(function () {
  'use strict';

  const script = document.currentScript;
  const SERVER = script?.getAttribute('data-server') || window.location.origin;

  // --- State ---
  let sessionId = null;
  let isOpen = false;
  let pollTimer = null;
  let lastMessageTs = Date.now();
  let isWaiting = false;
  let uploadedFiles = [];

  // --- Styles ---
  const css = `
  :root {
    --ls-primary: #064e3b;
    --ls-accent: #059669;
    --ls-accent-hover: #047857;
    --ls-bg: #ffffff;
    --ls-surface: #f0fdf4;
    --ls-border: #d1fae5;
    --ls-text: #111827;
    --ls-text-secondary: #6b7280;
    --ls-text-muted: #9ca3af;
    --ls-shadow: 0 4px 24px rgba(0,0,0,0.12);
    --ls-radius: 16px;
    --ls-radius-sm: 10px;
    --ls-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  #ls-chat-bubble {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--ls-accent);
    color: white;
    border: none;
    cursor: pointer;
    z-index: 99998;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--ls-shadow);
    transition: transform var(--ls-transition), opacity var(--ls-transition);
  }
  #ls-chat-bubble:hover {
    transform: scale(1.06);
    background: var(--ls-accent-hover);
  }
  #ls-chat-bubble.hidden { opacity: 0; pointer-events: none; transform: scale(0.8); }

  #ls-chat-window {
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 380px;
    max-width: calc(100vw - 32px);
    height: 560px;
    max-height: calc(100vh - 120px);
    background: var(--ls-bg);
    border-radius: var(--ls-radius);
    box-shadow: var(--ls-shadow);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    transform-origin: bottom right;
    transition: transform var(--ls-transition), opacity var(--ls-transition);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #ls-chat-window.closed {
    transform: scale(0.9);
    opacity: 0;
    pointer-events: none;
  }

  /* Header */
  .ls-header {
    display: flex;
    align-items: center;
    padding: 16px 18px;
    border-bottom: 1px solid var(--ls-border);
    background: var(--ls-accent);
    flex-shrink: 0;
  }
  .ls-header-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ls-accent);
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }
  .ls-header-info {
    margin-left: 12px;
    flex: 1;
    min-width: 0;
  }
  .ls-header-title {
    font-size: 15px;
    font-weight: 600;
    color: white;
    line-height: 1.2;
  }
  .ls-header-subtitle {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    line-height: 1.2;
    margin-top: 1px;
  }
  .ls-header-close {
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    color: rgba(255,255,255,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 18px;
    flex-shrink: 0;
    transition: background var(--ls-transition);
  }
  .ls-header-close:hover { background: rgba(255,255,255,0.15); }

  /* Messages */
  .ls-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
    background: var(--ls-bg);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ls-message {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: var(--ls-radius-sm);
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
    animation: ls-fadeIn 0.25s ease-out;
  }
  .ls-message.user {
    align-self: flex-end;
    background: var(--ls-accent);
    color: white;
    border-bottom-right-radius: 4px;
  }
  .ls-message.assistant {
    align-self: flex-start;
    background: var(--ls-surface);
    color: var(--ls-text);
    border-bottom-left-radius: 4px;
  }
  .ls-message.system {
    align-self: center;
    background: transparent;
    color: var(--ls-text-muted);
    font-size: 12px;
    padding: 4px 8px;
  }
  .ls-typing {
    align-self: flex-start;
    padding: 10px 14px;
    background: var(--ls-surface);
    border-radius: var(--ls-radius-sm);
    border-bottom-left-radius: 4px;
    display: flex;
    gap: 4px;
  }
  .ls-typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ls-text-muted);
    animation: ls-bounce 1.2s infinite;
  }
  .ls-typing span:nth-child(2) { animation-delay: 0.2s; }
  .ls-typing span:nth-child(3) { animation-delay: 0.4s; }

  /* File attachment preview */
  .ls-attachment-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--ls-surface);
    border-radius: var(--ls-radius-sm);
    margin: 4px 0;
  }
  .ls-attachment-preview .ls-attach-icon {
    width: 32px;
    height: 32px;
    background: var(--ls-border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .ls-attachment-preview .ls-attach-name {
    font-size: 12px;
    color: var(--ls-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ls-attachment-preview .ls-attach-remove {
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--ls-text-muted);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  .ls-attachment-preview .ls-attach-remove:hover { background: var(--ls-border); }

  /* Input area */
  .ls-input-area {
    padding: 12px 18px;
    border-top: 1px solid var(--ls-border);
    background: var(--ls-bg);
    flex-shrink: 0;
  }
  .ls-input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .ls-input-wrapper {
    flex: 1;
    background: var(--ls-surface);
    border-radius: 24px;
    border: 1px solid var(--ls-border);
    display: flex;
    align-items: flex-end;
    padding: 4px 8px;
    transition: border-color var(--ls-transition);
  }
  .ls-input-wrapper:focus-within {
    border-color: var(--ls-accent);
  }
  .ls-input-wrapper textarea {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    padding: 6px 8px;
    color: var(--ls-text);
    max-height: 120px;
    min-height: 22px;
  }
  .ls-input-wrapper textarea::placeholder {
    color: var(--ls-text-muted);
  }
  .ls-input-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: 4px;
  }
  .ls-input-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--ls-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 16px;
    transition: background var(--ls-transition), color var(--ls-transition);
  }
  .ls-input-btn:hover { background: var(--ls-border); color: var(--ls-text); }

  .ls-send-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--ls-accent);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    transition: background var(--ls-transition), transform var(--ls-transition);
  }
  .ls-send-btn:hover { background: var(--ls-accent-hover); }
  .ls-send-btn:disabled { background: var(--ls-border); cursor: default; }
  .ls-send-btn:not(:disabled):active { transform: scale(0.95); }

  /* Emoji picker */
  .ls-emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--ls-border);
    border-radius: var(--ls-radius-sm);
    box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
    padding: 12px;
    max-height: 240px;
    overflow-y: auto;
    display: none;
    z-index: 10;
  }
  .ls-emoji-picker.open { display: block; }
  .ls-emoji-search {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--ls-border);
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  .ls-emoji-search:focus { border-color: var(--ls-accent); }
  .ls-emoji-category {
    font-size: 11px;
    color: var(--ls-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 8px 0 4px;
  }
  .ls-emoji-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .ls-emoji-btn {
    width: 34px;
    height: 34px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background var(--ls-transition);
  }
  .ls-emoji-btn:hover { background: var(--ls-surface); }

  /* Footer */
  .ls-footer {
    text-align: right;
    padding: 6px 18px 8px;
    font-size: 11px;
    color: var(--ls-text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }
  .ls-footer-dots {
    display: flex;
    gap: 2px;
  }
  .ls-footer-dots span {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--ls-text-muted);
  }

  @keyframes ls-fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ls-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
  `;

  // --- Emoji data ---
  const EMOJIS = {
    'FREQUENTLY USED': ['👍', '👋', '❤️', '🔥', '✅', '😊', '🙏', '💡'],
    'SMILEYS & EMOTION': ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥺','😢','😭','😤','😡','🤬'],
    'SYMBOLS': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💘','💌','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘'],
    'OBJECTS': ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯'],
  };

  // --- DOM ---
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Bubble
  const bubble = document.createElement('button');
  bubble.id = 'ls-chat-bubble';
  bubble.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.onclick = () => toggleChat(true);
  document.body.appendChild(bubble);

  // Window
  const win = document.createElement('div');
  win.id = 'ls-chat-window';
  win.className = 'closed';
  win.innerHTML = `
    <div class="ls-header">
      <div class="ls-header-logo">HMI</div>
      <div class="ls-header-info">
        <div class="ls-header-title">HMO Intelligence</div>
        <div class="ls-header-subtitle">Market reports &amp; comparables</div>
      </div>
      <button class="ls-header-close" aria-label="Close chat">✕</button>
    </div>
    <div class="ls-messages" id="ls-messages"></div>
    <div class="ls-input-area">
      <div id="ls-attachments"></div>
      <div class="ls-input-row">
        <div class="ls-input-wrapper" style="position:relative;">
          <textarea id="ls-input" rows="1" placeholder="Ask about HMO valuations..." autofocus></textarea>
          <div class="ls-input-actions">
            <button class="ls-input-btn" id="ls-attach-btn" title="Attach file" aria-label="Attach file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button class="ls-input-btn" id="ls-emoji-btn" title="Add emoji" aria-label="Add emoji">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
          </div>
          <div class="ls-emoji-picker" id="ls-emoji-picker"></div>
        </div>
        <button class="ls-send-btn" id="ls-send-btn" disabled aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
    <div class="ls-footer">
      <div class="ls-footer-dots"><span></span><span></span><span></span><span></span></div>
      Powered by Nestflo
    </div>
  `;
  document.body.appendChild(win);

  // Cache elements
  const messagesEl = document.getElementById('ls-messages');
  const inputEl = document.getElementById('ls-input');
  const sendBtn = document.getElementById('ls-send-btn');
  const closeBtn = win.querySelector('.ls-header-close');
  const attachBtn = document.getElementById('ls-attach-btn');
  const emojiBtn = document.getElementById('ls-emoji-btn');
  const emojiPicker = document.getElementById('ls-emoji-picker');
  const attachmentsEl = document.getElementById('ls-attachments');

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // --- Build emoji picker ---
  function buildEmojiPicker(filter = '') {
    const f = filter.toLowerCase();
    let html = `<input class="ls-emoji-search" type="text" placeholder="Search emoji..." value="${filter.replace(/"/g,'&quot;')}" id="ls-emoji-search-input">`;
    for (const [cat, emojis] of Object.entries(EMOJIS)) {
      const filtered = f ? emojis.filter(e => e.includes(f)) : emojis;
      if (filtered.length === 0) continue;
      html += `<div class="ls-emoji-category">${cat}</div><div class="ls-emoji-grid">`;
      for (const emoji of filtered) {
        html += `<button class="ls-emoji-btn" data-emoji="${emoji}">${emoji}</button>`;
      }
      html += `</div>`;
    }
    emojiPicker.innerHTML = html;

    // Search input listener
    const searchInput = document.getElementById('ls-emoji-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => buildEmojiPicker(searchInput.value));
      setTimeout(() => searchInput.focus(), 50);
    }

    // Emoji click
    emojiPicker.querySelectorAll('.ls-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        insertAtCursor(inputEl, btn.dataset.emoji);
        emojiPicker.classList.remove('open');
        inputEl.focus();
      });
    });
  }
  buildEmojiPicker();

  // --- File upload ---
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    files.forEach(f => {
      uploadedFiles.push(f);
      const preview = document.createElement('div');
      preview.className = 'ls-attachment-preview';
      preview.innerHTML = `
        <div class="ls-attach-icon">📎</div>
        <div class="ls-attach-name">${escapeHtml(f.name)}</div>
        <button class="ls-attach-remove" data-name="${escapeHtml(f.name)}">✕</button>
      `;
      preview.querySelector('.ls-attach-remove').addEventListener('click', () => {
        uploadedFiles = uploadedFiles.filter(uf => uf.name !== f.name);
        preview.remove();
      });
      attachmentsEl.appendChild(preview);
    });
    fileInput.value = '';
  });

  // --- Helpers ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function insertAtCursor(el, text) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + text + el.value.substring(end);
    el.selectionStart = el.selectionEnd = start + text.length;
  }

  function toggleChat(open) {
    if (open === undefined) open = !isOpen;
    isOpen = open;
    if (open) {
      win.classList.remove('closed');
      bubble.classList.add('hidden');
      inputEl.focus();
      if (!sessionId) initSession();
      startPolling();
    } else {
      win.classList.add('closed');
      bubble.classList.remove('hidden');
      stopPolling();
    }
  }

  async function initSession() {
    addMessage('assistant', "👋 Hi! I can help you with HMO valuations. Want to know what your rooms are worth? Just ask!");
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    const hasFiles = uploadedFiles.length > 0;
    if (!text && !hasFiles) return;
    if (isWaiting) return;

    let messageText = text;
    if (hasFiles) {
      const fileNames = uploadedFiles.map(f => f.name).join(', ');
      messageText = text
        ? `${text}\n\n📎 Attached: ${fileNames}`
        : `📎 Attached: ${fileNames}`;
    }

    // Clear input
    inputEl.value = '';
    inputEl.style.height = 'auto';
    attachmentsEl.innerHTML = '';
    uploadedFiles = [];
    updateSendBtn();

    // Show user message
    addMessage('user', messageText);

    // Show typing indicator
    isWaiting = true;
    showTyping();

    try {
      const res = await fetch(`${SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: messageText }),
      });
      const data = await res.json();
      sessionId = data.sessionId;
    } catch (err) {
      console.error('Send failed:', err);
      hideTyping();
      addMessage('system', '⚠️ Message failed to send. Please try again.');
      isWaiting = false;
    }
  }

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = `ls-message ${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'ls-typing';
    el.id = 'ls-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('ls-typing');
    if (el) el.remove();
  }

  function updateSendBtn() {
    sendBtn.disabled = !inputEl.value.trim() && uploadedFiles.length === 0;
  }

  // --- Poll for responses ---
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(pollMessages, 1500);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  async function pollMessages() {
    if (!sessionId) return;
    try {
      const res = await fetch(`${SERVER}/api/chat/${sessionId}?since=${lastMessageTs}`);
      const data = await res.json();
      for (const msg of data.messages) {
        if (msg.timestamp > lastMessageTs) {
          lastMessageTs = msg.timestamp;
          if (msg.role === 'assistant') {
            hideTyping();
            isWaiting = false;
            addMessage('assistant', msg.text);
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  // --- Event listeners ---
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    updateSendBtn();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  closeBtn.addEventListener('click', () => toggleChat(false));
  attachBtn.addEventListener('click', () => fileInput.click());
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('open');
    if (emojiPicker.classList.contains('open')) buildEmojiPicker();
  });

  // Close emoji picker on outside click
  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.classList.remove('open');
    }
  });

  // Start polling if already open
  if (isOpen) startPolling();
})();

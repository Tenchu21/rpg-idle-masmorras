const STORAGE_KEY = 'rpg-idle-combat-chat-v1';
const MAX_MESSAGES = 40;
const gameApp = document.querySelector('#app');
const frame = document.querySelector('#world-demo .world-frame');
if (!gameApp || !frame) throw new Error('Não foi possível iniciar o chat de combate.');

const chat = document.createElement('section');
chat.className = 'combat-chat';
chat.setAttribute('aria-label', 'Chat de combate');
chat.innerHTML = `
  <header class="combat-chat-header">
    <div class="combat-chat-title"><span class="chat-live-dot" aria-hidden="true"></span><strong>Combate</strong><span class="chat-count" aria-label="Abates registrados">0</span></div>
    <button type="button" class="combat-chat-toggle" aria-label="Minimizar chat" aria-expanded="true">−</button>
  </header>
  <ol class="combat-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
    <li class="chat-welcome">Registro de abates: monstros derrotados aparecerão aqui.</li>
  </ol>`;
frame.append(chat);

const messageList = chat.querySelector('.combat-chat-messages');
const counter = chat.querySelector('.chat-count');
const toggle = chat.querySelector('.combat-chat-toggle');
let messages = loadMessages();
let lastObservedLog = gameApp.querySelector('.log-item')?.textContent.trim() || '';

function loadMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch {
    return [];
  }
}

function saveMessages() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch (error) {
    console.warn('Não foi possível salvar o chat de combate.', error);
  }
}

function renderMessages() {
  messageList.replaceChildren();
  if (!messages.length) {
    const welcome = document.createElement('li');
    welcome.className = 'chat-welcome';
    welcome.textContent = 'Registro de abates: monstros derrotados aparecerão aqui.';
    messageList.append(welcome);
  } else {
    for (const message of messages) {
      const entry = document.createElement('li');
      entry.className = 'chat-kill';
      const time = document.createElement('time');
      time.dateTime = message.timestamp;
      time.textContent = new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const text = document.createElement('span');
      text.textContent = message.text;
      entry.append(time, text);
      messageList.append(entry);
    }
  }
  counter.textContent = String(messages.length);
  messageList.scrollTop = messageList.scrollHeight;
}

function recordKillFromGameLog() {
  const latest = gameApp.querySelector('.log-item');
  const text = latest?.textContent.trim();
  if (!text || text === lastObservedLog) return;
  lastObservedLog = text;

  const defeated = text.match(/^(.+?) derrotado!\s*(.*)$/i);
  if (!defeated) return;

  messages.push({
    text: `${defeated[1]} derrotado${defeated[2] ? ` · ${defeated[2]}` : ''}`,
    timestamp: new Date().toISOString(),
  });
  messages = messages.slice(-MAX_MESSAGES);
  saveMessages();
  renderMessages();
}

toggle.addEventListener('click', () => {
  const collapsed = chat.classList.toggle('is-collapsed');
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.setAttribute('aria-label', collapsed ? 'Expandir chat' : 'Minimizar chat');
  toggle.textContent = collapsed ? '+' : '−';
});

new MutationObserver(recordKillFromGameLog).observe(gameApp, {
  childList: true,
  subtree: true,
  characterData: true,
});

renderMessages();

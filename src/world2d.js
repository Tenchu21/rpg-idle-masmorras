const root = document.querySelector('#world-demo');
if (!root) throw new Error('Não foi possível iniciar o campo 2D.');

const gameApp = document.querySelector('#app');
root.innerHTML = `
  <div class="world-frame">
    <canvas class="world-canvas" aria-label="Mapa 2D animado do Vale do Musgo"></canvas>
    <div class="world-hud">
      <div class="world-card"><strong>Vale do Musgo</strong><small>Zona inicial · caça automática</small><div class="world-status" role="status" aria-live="polite">Explorando a clareira…</div></div>
      <div class="world-card world-hero-card"><strong>Pip · Nv. 1</strong><small>⚔ Aventureiro</small></div>
    </div>
    <div class="world-controls">
      <label for="world-target">Alvo</label>
      <select id="world-target" aria-label="Monstro para caçar no mapa"></select>
      <button type="button" class="world-hunt-toggle" aria-pressed="false">▶ Iniciar caça</button>
      <span class="world-hint">Ao derrotar um monstro, Pip procura o próximo.</span>
    </div>
  </div>`;
const frameRoot = root.querySelector('.world-frame');
if (gameApp) frameRoot.append(gameApp);

const canvas = root.querySelector('canvas');
const ctx = canvas.getContext('2d');
const select = root.querySelector('#world-target');
const toggle = root.querySelector('.world-hunt-toggle');
const status = root.querySelector('.world-status');
const heroLabel = root.querySelector('.world-hero-card');
const monsters = [
  { id: 'slime', name: 'Slime Gelatinoso', emoji: '🟢', x: .28, y: .38, color: '#91d86a' },
  { id: 'rato', name: 'Rato de Esgoto', emoji: '🐀', x: .72, y: .34, color: '#aa9377' },
  { id: 'goblin', name: 'Goblin Ladrão', emoji: '👺', x: .73, y: .68, color: '#d58b54' },
  { id: 'lobo', name: 'Lobo Cinzento', emoji: '🐺', x: .28, y: .72, color: '#8fa0ad' },
  { id: 'esqueleto', name: 'Esqueleto Pé-de-Cabra', emoji: '💀', x: .5, y: .28, color: '#d9d3b9' },
];
const respawnAt = new Map();
const RESPAWN_DELAY = 7000;
let hero = { x: .5, y: .52, level: 1 };
let hunting = false;
let huntTimer = null;
let frame = 0;
let previousLogs = readLogs();
let lastCombatLog = '';
let combatFlashUntil = 0;

function readLogs() {
  return [...(gameApp?.querySelectorAll('.log-item') || [])].map((entry) => entry.textContent.trim());
}

// Detect newly prepended log messages without losing events when a render
// adds several combat lines at once.
function getNewLogs(current, previous) {
  for (let overlap = Math.min(current.length, previous.length); overlap >= 0; overlap -= 1) {
    let matches = true;
    for (let index = 0; index < overlap; index += 1) {
      if (current[index] !== previous[previous.length - overlap + index]) {
        matches = false;
        break;
      }
    }
    if (matches) return current.slice(0, current.length - overlap);
  }
  return current;
}

function isAlive(monster) {
  return Boolean(monster) && (respawnAt.get(monster.id) || 0) <= Date.now();
}
function availableMonsters() { return monsters.filter(isAlive); }
function nearestAvailableMonster() {
  const available = availableMonsters();
  if (!available.length) return null;
  return available.reduce((nearest, monster) => {
    const distance = Math.hypot(monster.x - hero.x, monster.y - hero.y);
    const bestDistance = Math.hypot(nearest.x - hero.x, nearest.y - hero.y);
    return distance < bestDistance ? monster : nearest;
  });
}
function setTarget(monster, message) {
  if (!monster) {
    status.textContent = 'Todos os monstros foram derrotados. Aguardando renascimento…';
    return;
  }
  select.value = monster.id;
  status.textContent = message || `Pip está indo atrás de ${monster.name}…`;
}
function syncMonsterOptions() {
  const selectedId = select.value;
  select.replaceChildren();
  for (const monster of monsters) {
    const option = document.createElement('option');
    option.value = monster.id;
    option.textContent = `${monster.emoji} ${monster.name}${isAlive(monster) ? '' : ' · renascendo'}`;
    option.disabled = !isAlive(monster);
    select.append(option);
  }
  if (selectedId && isAlive(monsters.find((monster) => monster.id === selectedId))) select.value = selectedId;
  else {
    const next = nearestAvailableMonster();
    if (next) select.value = next.id;
  }
}
function syncHeroLevel() {
  const levelTag = [...document.querySelectorAll('.panel-header .tag.rarity')].find((tag) => /nível/i.test(tag.textContent));
  const level = Number(levelTag?.textContent.match(/\d+/)?.[0]);
  if (Number.isFinite(level) && level > 0) {
    hero.level = level;
    heroLabel.innerHTML = `<strong>Pip · Nv. ${level}</strong><small>⚔ Aventureiro</small>`;
  }
}
function processNewCombatLogs() {
  const currentLogs = readLogs();
  const newLogs = getNewLogs(currentLogs, previousLogs);
  previousLogs = currentLogs;
  for (const text of newLogs) {
    if (text !== lastCombatLog) {
      lastCombatLog = text;
      if (/ataca|causa \d+ de dano|Golpe|Bola de Fogo|Veneno/i.test(text)) combatFlashUntil = performance.now() + 260;
    }
    const defeated = monsters.find((monster) => text.includes(`${monster.name} derrotado!`));
    if (!defeated || !isAlive(defeated)) continue;
    respawnAt.set(defeated.id, Date.now() + RESPAWN_DELAY);
    syncMonsterOptions();
    if (hunting && select.value === defeated.id) {
      const next = nearestAvailableMonster();
      if (next) setTarget(next, `${defeated.name} derrotado! Pip vai atrás de ${next.name}.`);
      else status.textContent = `${defeated.name} derrotado! Aguardando os monstros renascerem…`;
    } else status.textContent = `${defeated.name} derrotado e removido do mapa.`;
  }
}
function syncWorld() {
  syncHeroLevel();
  processNewCombatLogs();
  syncMonsterOptions();
  if (hunting && !availableMonsters().length) status.textContent = 'Todos os monstros foram derrotados. Aguardando renascimento…';
  else if (hunting && !isAlive(monsters.find((monster) => monster.id === select.value))) {
    const next = nearestAvailableMonster();
    if (next) setTarget(next);
  }
}
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawShadow(x, y, rx, ry) {
  ctx.fillStyle = 'rgba(24, 25, 18, .28)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function drawHero(x, y, time, moving) {
  const step = moving ? Math.sin(time * 12) : Math.sin(time * 2.2) * .1;
  const bob = moving ? Math.abs(Math.sin(time * 12)) * 2 : Math.sin(time * 2.2) * 1.2;
  drawShadow(x, y + 18, 15, 5);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.fillStyle = '#315d4e'; ctx.fillRect(-9, -2, 18, 18);
  ctx.fillStyle = '#405f9b'; ctx.fillRect(-11, 3, 22, 12);
  ctx.fillStyle = '#dbb58a'; ctx.fillRect(-6, -15, 12, 12);
  ctx.fillStyle = '#27453c'; ctx.fillRect(-10, -18, 20, 6);
  ctx.fillStyle = '#e6d481'; ctx.fillRect(10, -10 + step, 4, 25);
  ctx.fillStyle = '#25392f';
  ctx.fillRect(-8, 14 + Math.max(0, step) * 2, 6, 8);
  ctx.fillRect(2, 14 + Math.max(0, -step) * 2, 6, 8);
  ctx.restore();
}
function drawSlime(x, y, color, time) {
  const pulse = Math.sin(time * 3.1);
  const squash = 1 + pulse * .07;
  const stretch = 1 - pulse * .06;
  drawShadow(x, y + 12, 15 * squash, 5);
  ctx.save(); ctx.translate(x, y); ctx.scale(squash, stretch);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-15, 9); ctx.quadraticCurveTo(-12, -17, 0, -17); ctx.quadraticCurveTo(14, -17, 16, 9); ctx.quadraticCurveTo(4, 16, -15, 9); ctx.fill();
  ctx.fillStyle = 'rgba(235,255,190,.65)'; ctx.fillRect(-7, -10, 5, 3);
  ctx.fillStyle = '#243126'; ctx.fillRect(-6, -1, 3, 4); ctx.fillRect(5, -1, 3, 4);
  ctx.restore();
}
function drawRat(x, y, color, time) {
  const twitch = Math.sin(time * 8) * 2;
  drawShadow(x, y + 11, 17, 5);
  ctx.strokeStyle = '#5c4c42'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 12, y + 5); ctx.quadraticCurveTo(x + 25, y + 8 + twitch, x + 20, y + 17 + twitch); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 10, -.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bf9a88'; ctx.beginPath(); ctx.arc(x - 7, y - 7, 5, 0, Math.PI * 2); ctx.arc(x + 5, y - 7, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#29231f'; ctx.fillRect(x - 2, y - 1, 3, 3); ctx.fillRect(x + 7, y + 2, 3, 3);
}
function drawGoblin(x, y, color, time) {
  const step = Math.sin(time * 8) * 2;
  drawShadow(x, y + 17, 16, 5);
  ctx.fillStyle = '#c9a66c'; ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.lineTo(x - 21, y - 16); ctx.lineTo(x - 15, y - 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 9, y - 8); ctx.lineTo(x + 21, y - 16); ctx.lineTo(x + 15, y - 3); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(x - 11, y - 9, 22, 22);
  ctx.fillStyle = '#d7af7b'; ctx.fillRect(x - 9, y - 19, 18, 14);
  ctx.fillStyle = '#30241d'; ctx.fillRect(x - 6, y - 14, 4, 4); ctx.fillRect(x + 3, y - 14, 4, 4);
  ctx.fillStyle = '#f2e6c6'; ctx.fillRect(x - 5, y - 4, 4, 5); ctx.fillRect(x + 2, y - 4, 4, 5);
  ctx.fillStyle = '#6e4a36'; ctx.fillRect(x - 13, y + 13 + step, 8, 8); ctx.fillRect(x + 5, y + 13 - step, 8, 8);
}
function drawWolf(x, y, color, time) {
  const stride = Math.sin(time * 9) * 3;
  drawShadow(x, y + 12, 22, 6);
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x - 3, y + 1, 19, 11, -.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 13, y - 5, 11, 9, .18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#53616c'; ctx.beginPath(); ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 8, y - 22); ctx.lineTo(x + 16, y - 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 17, y - 10); ctx.lineTo(x + 25, y - 19); ctx.lineTo(x + 24, y - 5); ctx.fill();
  ctx.fillStyle = '#2c3336'; ctx.fillRect(x + 16, y - 6, 3, 3);
  ctx.strokeStyle = '#526069'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 17, y - 1); ctx.quadraticCurveTo(x - 27, y - 12 + stride, x - 23, y - 18 + stride); ctx.stroke();
  ctx.strokeStyle = '#56616a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 10, y + 8); ctx.lineTo(x - 12 + stride, y + 17); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 8 - stride, y + 17); ctx.stroke();
}
function drawSkeleton(x, y, time) {
  const sway = Math.sin(time * 4) * 1.5;
  drawShadow(x, y + 16, 15, 5);
  ctx.save(); ctx.translate(0, sway);
  ctx.fillStyle = '#ded8c4'; ctx.beginPath(); ctx.arc(x, y - 13, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#30302b'; ctx.fillRect(x - 6, y - 16, 4, 4); ctx.fillRect(x + 3, y - 16, 4, 4);
  ctx.fillStyle = '#9b947f'; ctx.fillRect(x - 8, y - 3, 16, 20);
  ctx.strokeStyle = '#eee5cb'; ctx.lineWidth = 2;
  for (let rib = 0; rib < 3; rib += 1) { ctx.beginPath(); ctx.moveTo(x - 7, y + rib * 5); ctx.lineTo(x + 7, y + rib * 5); ctx.stroke(); }
  ctx.strokeStyle = '#ded8c4'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 16, y + 9); ctx.moveTo(x + 8, y); ctx.lineTo(x + 15, y + 8); ctx.moveTo(x - 4, y + 17); ctx.lineTo(x - 7, y + 26); ctx.moveTo(x + 4, y + 17); ctx.lineTo(x + 7, y + 26); ctx.stroke();
  ctx.restore();
}
function drawMonster(monster, x, y, time) {
  if (monster.id === 'slime') drawSlime(x, y, monster.color, time);
  else if (monster.id === 'rato') drawRat(x, y, monster.color, time);
  else if (monster.id === 'goblin') drawGoblin(x, y, monster.color, time);
  else if (monster.id === 'lobo') drawWolf(x, y, monster.color, time);
  else if (monster.id === 'esqueleto') drawSkeleton(x, y, time);
}
function draw() {
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  if (!width || !height) { requestAnimationFrame(draw); return; }
  frame += 1; const time = frame / 60; ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#a9a16d'; ctx.fillRect(0, 0, width, height);
  const tile = Math.max(12, Math.round(width / 62));
  for (let y = 0; y < height; y += tile) for (let x = 0; x < width; x += tile) {
    const hash = ((x * 17 + y * 31) % 13);
    ctx.fillStyle = hash < 4 ? '#b7ad76' : hash < 7 ? '#a59b68' : '#b0a773'; ctx.fillRect(x, y, tile - 1, tile - 1);
    if (hash === 1 || hash === 8) { ctx.fillStyle = '#6f7953'; ctx.fillRect(x + tile * .35, y + tile * .38, 2, 2); }
  }
  ctx.fillStyle = '#c9b77d'; ctx.beginPath(); ctx.moveTo(0, height * .16); ctx.lineTo(width * .29, height * .16); ctx.lineTo(width * .39, height * .38); ctx.lineTo(width * .64, height * .38); ctx.lineTo(width * .74, height * .65); ctx.lineTo(width, height * .65); ctx.lineTo(width, height * .82); ctx.lineTo(width * .66, height * .82); ctx.lineTo(width * .56, height * .55); ctx.lineTo(width * .34, height * .55); ctx.lineTo(width * .24, height * .34); ctx.lineTo(0, height * .34); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(93, 79, 48, .35)'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 17; i += 1) {
    const x = ((i * 137 + 43) % width); const y = ((i * 83 + 29) % height);
    if (Math.abs(x - hero.x * width) < 38 && Math.abs(y - hero.y * height) < 38) continue;
    ctx.fillStyle = i % 3 === 0 ? '#e2d9bd' : '#716c5b'; ctx.beginPath(); ctx.ellipse(x, y, i % 3 === 0 ? 8 : 13, i % 3 === 0 ? 5 : 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(40, 42, 34, .45)'; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(100, 155, 164, .78)'; ctx.beginPath(); ctx.ellipse(width * .9, height * .12, width * .09, height * .16, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210, 232, 210, .55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.moveTo(width * .84, height * (.05 + i * .06)); ctx.quadraticCurveTo(width * .9, height * (.02 + i * .06), width * .96, height * (.05 + i * .06)); ctx.stroke(); }
  for (const monster of monsters) {
    if (!isAlive(monster)) continue;
    const x = monster.x * width; const y = monster.y * height + Math.sin(time * 2 + monster.x * 10) * 2;
    drawMonster(monster, x, y, time); ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#18251d'; ctx.fillText(monster.name, x + 1, y - 25); ctx.fillStyle = '#f2edcc'; ctx.fillText(monster.name, x, y - 26);
  }
  let moving = false;
  if (hunting) {
    const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)) || nearestAvailableMonster();
    if (target) {
      if (select.value !== target.id) select.value = target.id;
      const dx = target.x - hero.x; const dy = target.y - hero.y;
      moving = Math.hypot(dx, dy) > .015;
      const speed = moving ? .022 : .035;
      hero.x += dx * speed; hero.y += dy * speed;
      ctx.strokeStyle = 'rgba(231, 228, 163, .8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hero.x * width, hero.y * height, 29 + Math.sin(time * 7) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (performance.now() < combatFlashUntil) {
    ctx.save(); ctx.globalAlpha = Math.max(0, (combatFlashUntil - performance.now()) / 260);
    ctx.fillStyle = '#fff1aa'; ctx.beginPath(); ctx.arc(hero.x * width, hero.y * height - 12, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  drawHero(hero.x * width, hero.y * height + Math.sin(time * 2) * 1.2, time, moving);
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#102016'; ctx.fillText('Pip', hero.x * width + 1, hero.y * height - 23); ctx.fillStyle = '#efffd8'; ctx.fillText('Pip', hero.x * width, hero.y * height - 24);
  requestAnimationFrame(draw);
}
function attackInExistingGame() {
  const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)) || nearestAvailableMonster();
  if (!target) { status.textContent = 'Todos os monstros foram derrotados. Aguardando renascimento…'; return false; }
  if (select.value !== target.id) { select.value = target.id; status.textContent = `Novo alvo: ${target.name}. Pip está indo atrás dele…`; }
  const attackButton = document.querySelector(`[data-action="fight"][data-monster-id="${CSS.escape(target.id)}"]`);
  if (!attackButton) { status.textContent = 'Carregando o sistema de combate…'; return false; }
  attackButton.click(); if (status.textContent.startsWith('Pip está')) status.textContent = `Pip está caçando ${target.name}…`; return true;
}
function stopHunt(message) {
  hunting = false; window.clearInterval(huntTimer); huntTimer = null;
  toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = '▶ Iniciar caça'; status.textContent = message;
}
toggle.addEventListener('click', () => {
  if (hunting) { stopHunt('Caça pausada.'); return; }
  syncWorld();
  if (!nearestAvailableMonster()) { status.textContent = 'Não há monstros no mapa. Aguarde o renascimento.'; return; }
  hunting = true; toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = 'Ⅱ Pausar caça';
  const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)) || nearestAvailableMonster(); setTarget(target, `Pip está indo atrás de ${target.name}…`);
  huntTimer = window.setInterval(() => {
    if (!hunting) return; syncWorld();
    const hpText = [...document.querySelectorAll('.progress-label')].find((label) => label.textContent.includes('Vida'));
    const values = hpText?.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if (values && Number(values[1]) / Math.max(1, Number(values[2])) < .2) { stopHunt('Caça pausada: vida abaixo de 20%.'); return; }
    attackInExistingGame();
  }, 1400);
});
select.addEventListener('change', () => { const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)); if (target) status.textContent = hunting ? `Pip está indo atrás de ${target.name}…` : `Alvo selecionado: ${target.name}.`; });
window.addEventListener('resize', resizeCanvas);
if (gameApp) new MutationObserver(syncWorld).observe(gameApp, { childList: true, subtree: true, characterData: true });
syncWorld(); resizeCanvas(); requestAnimationFrame(draw); window.setInterval(syncWorld, 500);

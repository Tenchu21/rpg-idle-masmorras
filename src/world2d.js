const root = document.querySelector('#world-demo');
if (!root) throw new Error('Não foi possível iniciar o campo 2D.');

// Keep the full game UI and mount it over the map as an in-world HUD.
const gameApp = document.querySelector('#app');
root.innerHTML = `
  <div class="world-frame">
    <canvas class="world-canvas" aria-label="Mapa 2D do Vale do Musgo"></canvas>
    <div class="world-hud">
      <div class="world-card"><strong>Vale do Musgo</strong><small>Zona inicial · caça automática de teste</small><div class="world-status" role="status" aria-live="polite">Explorando a clareira…</div></div>
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
let huntTimer;
let frame = 0;
let lastObservedLog = '';

function isAlive(monster) {
  return (respawnAt.get(monster.id) || 0) <= Date.now();
}

function availableMonsters() {
  return monsters.filter(isAlive);
}

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
    status.textContent = 'Todos os monstros foram derrotados. Aguardando novos inimigos…';
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
  if (selectedId && isAlive(monsters.find((monster) => monster.id === selectedId))) {
    select.value = selectedId;
  } else {
    const next = nearestAvailableMonster();
    if (next) select.value = next.id;
  }
}

function syncHeroLevel() {
  const levelTag = [...document.querySelectorAll('.panel-header .tag.rarity')]
    .find((tag) => /nível/i.test(tag.textContent));
  const level = Number(levelTag?.textContent.match(/\d+/)?.[0]);
  if (Number.isFinite(level) && level > 0) {
    hero.level = level;
    heroLabel.innerHTML = `<strong>Pip · Nv. ${level}</strong><small>⚔ Aventureiro</small>`;
  }
}

function processLatestCombatLog() {
  const latestLog = gameApp?.querySelector('.log-item');
  if (!latestLog) return;
  const text = latestLog.textContent.trim();
  if (!text || text === lastObservedLog) return;
  lastObservedLog = text;
  const defeated = monsters.find((monster) => text.includes(`${monster.name} derrotado!`));
  if (!defeated || !isAlive(defeated)) return;

  respawnAt.set(defeated.id, Date.now() + RESPAWN_DELAY);
  syncMonsterOptions();

  if (hunting && select.value === defeated.id) {
    const next = nearestAvailableMonster();
    if (next) {
      setTarget(next, `${defeated.name} derrotado! Pip vai atrás de ${next.name}.`);
    } else {
      status.textContent = `${defeated.name} derrotado! Aguardando os monstros renascerem…`;
    }
  } else {
    status.textContent = `${defeated.name} derrotado e removido do mapa.`;
  }
}

function syncWorld() {
  syncHeroLevel();
  processLatestCombatLog();
  syncMonsterOptions();
  if (hunting && !availableMonsters().length) {
    status.textContent = 'Todos os monstros foram derrotados. Aguardando renascimento…';
  } else if (hunting && !isAlive(monsters.find((monster) => monster.id === select.value))) {
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

function drawPixelPerson(x, y, color, isHero = false) {
  const size = isHero ? 24 : 19;
  ctx.fillStyle = 'rgba(24, 25, 18, .28)';
  ctx.beginPath(); ctx.ellipse(x, y + size * .72, size * .72, size * .25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  ctx.fillStyle = isHero ? '#dbb58a' : '#f1e7c7';
  ctx.fillRect(Math.round(x - size * .28), Math.round(y - size * .65), size * .56, size * .45);
  ctx.fillStyle = isHero ? '#315d4e' : '#48535a';
  ctx.fillRect(Math.round(x - size * .38), Math.round(y + size * .28), size * .76, size * .34);
  ctx.fillStyle = '#22251e';
  ctx.fillRect(Math.round(x - size * .22), Math.round(y - size * .53), 3, 3);
  ctx.fillRect(Math.round(x + size * .08), Math.round(y - size * .53), 3, 3);
  if (isHero) {
    ctx.fillStyle = '#e6d481';
    ctx.fillRect(Math.round(x + size * .4), Math.round(y - size * .42), 4, size * .85);
  }
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) {
    requestAnimationFrame(draw);
    return;
  }
  frame += 1;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#a9a16d'; ctx.fillRect(0, 0, width, height);
  const tile = Math.max(12, Math.round(width / 62));
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const hash = ((x * 17 + y * 31) % 13);
      ctx.fillStyle = hash < 4 ? '#b7ad76' : hash < 7 ? '#a59b68' : '#b0a773';
      ctx.fillRect(x, y, tile - 1, tile - 1);
      if (hash === 1 || hash === 8) {
        ctx.fillStyle = '#6f7953';
        ctx.fillRect(x + tile * .35, y + tile * .38, 2, 2);
      }
    }
  }
  ctx.fillStyle = '#c9b77d';
  ctx.beginPath();
  ctx.moveTo(0, height * .16); ctx.lineTo(width * .29, height * .16); ctx.lineTo(width * .39, height * .38);
  ctx.lineTo(width * .64, height * .38); ctx.lineTo(width * .74, height * .65); ctx.lineTo(width, height * .65);
  ctx.lineTo(width, height * .82); ctx.lineTo(width * .66, height * .82); ctx.lineTo(width * .56, height * .55);
  ctx.lineTo(width * .34, height * .55); ctx.lineTo(width * .24, height * .34); ctx.lineTo(0, height * .34); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(93, 79, 48, .35)'; ctx.lineWidth = 2; ctx.stroke();

  for (let i = 0; i < 17; i += 1) {
    const x = ((i * 137 + 43) % width);
    const y = ((i * 83 + 29) % height);
    if (Math.abs(x - hero.x * width) < 38 && Math.abs(y - hero.y * height) < 38) continue;
    ctx.fillStyle = i % 3 === 0 ? '#e2d9bd' : '#716c5b';
    ctx.beginPath(); ctx.ellipse(x, y, i % 3 === 0 ? 8 : 13, i % 3 === 0 ? 5 : 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40, 42, 34, .45)'; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(100, 155, 164, .78)';
  ctx.beginPath(); ctx.ellipse(width * .9, height * .12, width * .09, height * .16, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210, 232, 210, .55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath(); ctx.moveTo(width * .84, height * (.05 + i * .06));
    ctx.quadraticCurveTo(width * .9, height * (.02 + i * .06), width * .96, height * (.05 + i * .06)); ctx.stroke();
  }

  for (const monster of monsters) {
    if (!isAlive(monster)) continue;
    const x = monster.x * width;
    const y = monster.y * height + Math.sin(frame / 18 + monster.x * 10) * 2;
    drawPixelPerson(x, y, monster.color);
    ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#18251d';
    ctx.fillText(monster.name, x + 1, y - 22 + 1);
    ctx.fillStyle = '#f2edcc'; ctx.fillText(monster.name, x, y - 23);
  }

  if (hunting) {
    const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)) || nearestAvailableMonster();
    if (target) {
      if (select.value !== target.id) select.value = target.id;
      hero.x += (target.x - hero.x) * .035;
      hero.y += (target.y - hero.y) * .035;
      ctx.strokeStyle = 'rgba(231, 228, 163, .8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hero.x * width, hero.y * height, 29 + Math.sin(frame / 8) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }
  drawPixelPerson(hero.x * width, hero.y * height + Math.sin(frame / 12) * 2, '#405f9b', true);
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#102016';
  ctx.fillText('Pip', hero.x * width + 1, hero.y * height - 23);
  ctx.fillStyle = '#efffd8'; ctx.fillText('Pip', hero.x * width, hero.y * height - 24);
  requestAnimationFrame(draw);
}

function attackInExistingGame() {
  const aliveTarget = monsters.find((monster) => monster.id === select.value && isAlive(monster));
  const target = aliveTarget || nearestAvailableMonster();
  if (!target) {
    status.textContent = 'Todos os monstros foram derrotados. Aguardando renascimento…';
    return false;
  }
  if (select.value !== target.id) {
    select.value = target.id;
    status.textContent = `Novo alvo: ${target.name}. Pip está indo atrás dele…`;
  }
  const attackButton = document.querySelector(`[data-action="fight"][data-monster-id="${CSS.escape(target.id)}"]`);
  if (attackButton) {
    attackButton.click();
    if (status.textContent.startsWith('Pip está')) status.textContent = `Pip está caçando ${target.name}…`;
    return true;
  }
  status.textContent = 'Carregando o sistema de combate…';
  return false;
}

function stopHunt(message) {
  hunting = false;
  window.clearInterval(huntTimer);
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = '▶ Iniciar caça';
  status.textContent = message;
}

toggle.addEventListener('click', () => {
  if (hunting) {
    stopHunt('Caça pausada.');
    return;
  }
  syncWorld();
  if (!nearestAvailableMonster()) {
    status.textContent = 'Não há monstros no mapa. Aguarde o renascimento.';
    return;
  }
  hunting = true;
  toggle.setAttribute('aria-pressed', 'true');
  toggle.textContent = 'Ⅱ Pausar caça';
  const target = monsters.find((monster) => monster.id === select.value && isAlive(monster)) || nearestAvailableMonster();
  setTarget(target, `Pip está indo atrás de ${target.name}…`);
  huntTimer = window.setInterval(() => {
    if (!hunting) return;
    syncWorld();
    const hpText = [...document.querySelectorAll('.progress-label')].find((label) => label.textContent.includes('Vida'));
    if (hpText) {
      const values = hpText.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (values && Number(values[1]) / Math.max(1, Number(values[2])) < .2) {
        stopHunt('Caça pausada: vida abaixo de 20%.');
        return;
      }
    }
    attackInExistingGame();
  }, 1400);
});

select.addEventListener('change', () => {
  const target = monsters.find((monster) => monster.id === select.value && isAlive(monster));
  if (target) status.textContent = hunting ? `Pip está indo atrás de ${target.name}…` : `Alvo selecionado: ${target.name}.`;
});

// The combat UI logs a defeat. Use it to hide the defeated map sprite and retarget.
const initialLog = gameApp?.querySelector('.log-item');
if (initialLog) lastObservedLog = initialLog.textContent.trim();
if (gameApp) {
  new MutationObserver(syncWorld).observe(gameApp, { childList: true, subtree: true, characterData: true });
}

window.addEventListener('resize', resizeCanvas);
syncWorld();
resizeCanvas();
requestAnimationFrame(draw);
window.setInterval(syncWorld, 500);

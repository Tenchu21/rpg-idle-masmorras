const defaultState = {
  hero: {
    name: 'Pip',
    level: 1,
    xp: 0,
    xpNext: 20,
    gold: 32,
    potions: 1,
    attributes: { forca: 5, destreza: 5, inteligencia: 5, vitalidade: 5 },
    hp: 60,
    maxHp: 60,
    maxInventory: 20,
    equipment: { arma: null, capacete: null, armadura: null, botas: null, acessorio1: null, acessorio2: null },
  },
  monsters: [
    { id: 'slime', name: 'Slime Gelatinoso', hp: 22, maxHp: 22, gold: 5, xp: 10, emoji: '🟢' },
    { id: 'rato', name: 'Rato de Esgoto', hp: 18, maxHp: 18, gold: 4, xp: 8, emoji: '🐀' },
    { id: 'goblin', name: 'Goblin Ladrão', hp: 40, maxHp: 40, gold: 12, xp: 18, emoji: '👺' },
    { id: 'lobo', name: 'Lobo Cinzento', hp: 70, maxHp: 70, gold: 18, xp: 26, emoji: '🐺' },
  ],
  inventory: [
    { id: 'adaga', name: 'Adaga Enferrujada', slot: 'arma', rarity: 'Comum', skill: 'Veneno', value: 12 },
    { id: 'botas', name: 'Botas Remendadas', slot: 'botas', rarity: 'Comum', skill: 'Passo Sombrio', value: 10 },
    { id: 'elmo', name: 'Elmo de Latão', slot: 'capacete', rarity: 'Raro', skill: 'Muralha', value: 22 },
  ],
  shop: [
    { id: 'pocao', name: 'Poção de vida', price: 15, type: 'potion' },
    { id: 'espada', name: 'Espada Larga do Guarda', price: 28, type: 'item' },
    { id: 'amuleto', name: 'Amuleto do Coelho', price: 35, type: 'item' },
  ],
  log: [
    { text: 'A jornada começa em Valeflore. A vila está tranquila e o herói está pronto para explorar.', type: 'info' },
    { text: 'Seu primeiro item já foi encontrado: Adaga Enferrujada. A habilidade de Veneno será útil no campo.', type: 'info' },
  ],
};

const state = structuredClone(defaultState);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function addLog(text, type = 'info') {
  state.log.unshift({ text, type });
  state.log = state.log.slice(0, 8);
}

function getTotalOffense() {
  const weapon = state.inventory.find((item) => item.id === state.hero.equipment.arma);
  return state.hero.attributes.forca + (weapon ? 4 : 0);
}

function getNextLevelXp(level) {
  return 20 * (level ** 2);
}

function levelUpIfNeeded() {
  while (state.hero.xp >= state.hero.xpNext) {
    state.hero.xp -= state.hero.xpNext;
    state.hero.level += 1;
    state.hero.xpNext = getNextLevelXp(state.hero.level);
    addLog(`Nível ${state.hero.level} alcançado! 3 pontos livres disponíveis para distribuir.`, 'success');
  }
}

function usePotion() {
  if (state.hero.potions <= 0) {
    addLog('Você não tem poções suficientes.', 'warning');
    return;
  }

  state.hero.potions -= 1;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 40);
  addLog('Poção de vida consumida. O herói recuperou 40 de vida.', 'success');
  render();
}

function buyPotion() {
  if (state.hero.gold < 15) {
    addLog('Você não tem ouro suficiente para comprar uma poção.', 'warning');
    return;
  }

  state.hero.gold -= 15;
  state.hero.potions += 1;
  addLog('Você comprou uma poção de vida na vila.', 'info');
  render();
}

function getMonsterById(monsterId) {
  return state.monsters.find((monster) => monster.id === monsterId);
}

function attackMonster(monsterId) {
  const monster = getMonsterById(monsterId);
  if (!monster) return;

  const heroDamage = 6 + getTotalOffense() + Math.floor(Math.random() * 7);
  monster.hp = Math.max(0, monster.hp - heroDamage);

  addLog(`${state.hero.name} ataca ${monster.name} e causa ${heroDamage} de dano.`, 'info');

  if (monster.hp <= 0) {
    state.hero.xp += monster.xp;
    state.hero.gold += monster.gold;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 8);
    addLog(`${monster.name} foi derrotado! Ouro +${monster.gold} e XP +${monster.xp}.`, 'success');

    const dropRoll = Math.random();
    if (dropRoll < 0.4) {
      const lootNames = ['Adaga de Ferro', 'Botas de Couro', 'Anel do Garimpeiro', 'Amuleto de Musgo'];
      const reward = lootNames[Math.floor(Math.random() * lootNames.length)];
      state.inventory.push({
        id: `${reward.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        name: reward,
        slot: 'acessorio',
        rarity: 'Incomum',
        skill: 'Faro de Tesouro',
        value: 18,
      });
      addLog(`Você encontrou um item raro no cadáver: ${reward}.`, 'success');
    }

    monster.hp = monster.maxHp;
    levelUpIfNeeded();
    render();
    return;
  }

  const enemyDamage = Math.max(2, monster.maxHp > 40 ? 9 : 5) + Math.floor(Math.random() * 4);
  state.hero.hp = Math.max(0, state.hero.hp - enemyDamage);
  addLog(`${monster.name} contra-ataca e causa ${enemyDamage} de dano.`, 'danger');

  if (state.hero.hp <= 0) {
    state.hero.hp = state.hero.maxHp;
    addLog('O herói caiu, mas voltou à vila com a vida reabastecida.', 'warning');
  }

  render();
}

function equipItem(itemId) {
  const itemIndex = state.inventory.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) return;

  const item = state.inventory[itemIndex];
  const slot = item.slot;
  const equipped = state.hero.equipment[slot];

  if (equipped) {
    state.inventory.splice(itemIndex, 1);
    state.inventory.push(equipped);
  } else {
    state.inventory.splice(itemIndex, 1);
  }

  state.hero.equipment[slot] = item.id;
  addLog(`${item.name} foi equipado em ${slot}.`, 'success');
  render();
}

function sellItem(itemId) {
  const itemIndex = state.inventory.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) return;

  const item = state.inventory[itemIndex];
  state.hero.gold += item.value;
  state.inventory.splice(itemIndex, 1);
  addLog(`${item.name} foi vendido por ${item.value} ouro.`, 'info');
  render();
}

function boostAttribute(key) {
  const availablePoints = state.hero.level - 1;
  if (availablePoints <= 0) {
    addLog('Você não tem pontos de atributo disponíveis.', 'warning');
    return;
  }

  state.hero.attributes[key] += 1;
  state.hero.maxHp = 50 + state.hero.attributes.vitalidade * 10;
  state.hero.hp = state.hero.maxHp;
  addLog(`${key} aumentou para ${state.hero.attributes[key]}.`, 'success');
  render();
}

function render() {
  const app = document.querySelector('#app');
  const hero = state.hero;

  const heroMaxHp = 50 + hero.attributes.vitalidade * 10;
  const hpPercent = clamp((hero.hp / heroMaxHp) * 100, 0, 100);
  const xpPercent = clamp((hero.xp / hero.xpNext) * 100, 0, 100);

  app.innerHTML = `
    <div class="dashboard">
      <header class="topbar">
        <div class="title-wrap">
          <span>RPG Idle</span>
          <h1>Masmorras do Vale do Musgo</h1>
        </div>

        <div class="topbar-metrics">
          <div class="metric-pill">
            <small>Ouro</small>
            <strong>${hero.gold}</strong>
          </div>
          <div class="metric-pill">
            <small>XP</small>
            <strong>${hero.xp}/${hero.xpNext}</strong>
          </div>
          <div class="metric-pill">
            <small>Poções</small>
            <strong>${hero.potions}</strong>
          </div>
        </div>
      </header>

      <main class="main-grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Herói</h2>
            <span class="tag rarity">Nível ${hero.level}</span>
          </div>

          <div class="hero-panel">
            <div class="hero-card">
              <div class="avatar" aria-label="Avatar do herói">⚔️</div>

              <div class="hero-meta">
                <h3>${hero.name}</h3>
                <p>Sem classe • explorador do vale</p>

                <div class="hero-stats">
                  <div class="stat-box">
                    <span>FOR</span>
                    <strong>${hero.attributes.forca}</strong>
                  </div>
                  <div class="stat-box">
                    <span>DES</span>
                    <strong>${hero.attributes.destreza}</strong>
                  </div>
                  <div class="stat-box">
                    <span>INT</span>
                    <strong>${hero.attributes.inteligencia}</strong>
                  </div>
                  <div class="stat-box">
                    <span>VIT</span>
                    <strong>${hero.attributes.vitalidade}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div class="progress-block">
              <div class="progress-label">
                <span>Vida</span>
                <span>${hero.hp}/${heroMaxHp}</span>
              </div>
              <div class="progress-bar hp"><span style="width: ${hpPercent}%"></span></div>
            </div>

            <div class="progress-block">
              <div class="progress-label">
                <span>Experiência</span>
                <span>${hero.xp}/${hero.xpNext}</span>
              </div>
              <div class="progress-bar"><span style="width: ${xpPercent}%"></span></div>
            </div>

            <div class="secondary-grid">
              <div class="panel action-panel">
                <div class="panel-header">
                  <h3>Ações</h3>
                </div>

                <ul class="action-list" style="margin-top: 14px;">
                  <li><button class="action-btn primary" data-action="attack">Caçar</button></li>
                  <li><button class="action-btn warning" data-action="potion">Usar poção</button></li>
                  <li><button class="action-btn" data-action="shop">Comprar</button></li>
                </ul>

                <div class="monster-list">
                  ${state.monsters.map((monster) => `
                    <div class="monster-card" data-monster-id="${monster.id}">
                      <div class="monster-name">
                        <strong>${monster.emoji} ${monster.name}</strong>
                        <span>${monster.hp}/${monster.maxHp} HP • ${monster.gold} ouro</span>
                      </div>
                      <div class="monster-meta">
                        <span class="monster-badge">+${monster.xp} XP</span>
                        <button class="action-btn" data-action="fight" data-monster-id="${monster.id}">Atacar</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="panel shop-panel">
                <div class="panel-header">
                  <h3>Loja da vila</h3>
                </div>
                <ul class="shop-list" style="margin-top: 14px; display: grid; gap: 10px;">
                  ${state.shop.map((item) => `
                    <li class="item-box">
                      <div class="item-info">
                        <strong>${item.name}</strong>
                        <small>${item.type === 'potion' ? 'Recupera vida' : 'Item de combate'}</small>
                      </div>
                      <button class="shop-btn" data-action="buy" data-buy-id="${item.id}">${item.price} ouro</button>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <aside class="panel">
          <div class="panel-header">
            <h2>Inventário</h2>
            <span class="tag">${state.inventory.length}/${hero.maxInventory}</span>
          </div>

          <div class="inventory-panel">
            <div class="panel-header" style="padding: 0 0 12px; border-bottom: 0; margin-bottom: 12px;">
              <h3>Equipamentos</h3>
            </div>

            <ul class="equipment-list" style="display: grid; gap: 10px;">
              ${['arma', 'capacete', 'armadura', 'botas', 'acessorio1', 'acessorio2'].map((slot) => {
                const itemId = hero.equipment[slot];
                const item = state.inventory.find((entry) => entry.id === itemId);
                return `
                  <li class="slot-box">
                    <div class="slot-info">
                      <strong>${slot}</strong>
                      <small>${item ? item.name : 'Vazio'}</small>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>

            <div class="panel-header" style="padding: 0 0 12px; border-bottom: 0; margin: 18px 0 12px;">
              <h3>Itens</h3>
            </div>

            <ul class="inventory-list" style="display: grid; gap: 10px;">
              ${state.inventory.map((item) => `
                <li class="item-box">
                  <div class="item-info">
                    <strong>${item.name}</strong>
                    <small>${item.skill} • ${item.rarity}</small>
                  </div>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button class="inventory-btn" data-action="equip" data-item-id="${item.id}">Equipar</button>
                    <button class="inventory-btn" data-action="sell" data-item-id="${item.id}">Vender</button>
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="panel-header" style="margin-top: 18px;">
            <h2>Registro</h2>
          </div>

          <div class="log-panel">
            <ul class="log-list">
              ${state.log.map((entry) => `<li class="log-item"><strong>${entry.type === 'success' ? '✔' : entry.type === 'danger' ? '⚠' : '•'}</strong> ${entry.text}</li>`).join('')}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  `;

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const action = button.dataset.action;

      if (action === 'fight') {
        attackMonster(button.dataset.monsterId);
      }

      if (action === 'buy') {
        const buyId = button.dataset.buyId;
        if (buyId === 'pocao') {
          buyPotion();
        }
      }

      if (action === 'equip') {
        equipItem(button.dataset.itemId);
      }

      if (action === 'sell') {
        sellItem(button.dataset.itemId);
      }

      if (action === 'potion') {
        usePotion();
      }

      if (action === 'shop') {
        addLog('A vila está aberta. Poções e itens de reforço estão disponíveis.', 'info');
        render();
      }

      if (action === 'attack') {
        const monster = state.monsters[Math.floor(Math.random() * state.monsters.length)];
        attackMonster(monster.id);
      }
    });
  });
}

render();

function init() {
  state.hero.maxHp = 50 + state.hero.attributes.vitalidade * 10;
  state.hero.hp = state.hero.maxHp;
  state.hero.xpNext = getNextLevelXp(state.hero.level);
}

init();
render();

window.addEventListener('beforeunload', () => {
  localStorage.setItem('rpg-idle-masmorras', JSON.stringify(state));
});

try {
  const saved = localStorage.getItem('rpg-idle-masmorras');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.hero.maxHp = 50 + state.hero.attributes.vitalidade * 10;
    state.hero.hp = Math.min(state.hero.hp, state.hero.maxHp);
    state.hero.xpNext = getNextLevelXp(state.hero.level);
    render();
  }
} catch (error) {
  console.warn('Não foi possível restaurar o progresso salvo.', error);
}

setInterval(() => {
  if (state.hero.hp < state.hero.maxHp) {
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 1);
  }
}, 1300);

setInterval(() => {
  render();
}, 5000);

// Ajuste visual para refletir o progresso do herói em tempo real.
setInterval(() => {
  if (state.hero.hp > 0) {
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 1);
  }
}, 3000);

console.log('Interface renovada do RPG Idle de Masmorras carregada.');

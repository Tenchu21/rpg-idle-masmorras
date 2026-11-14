const STORAGE_KEY = 'rpg-idle-masmorras';
const AUTO_HUNT_INTERVAL = 1200;

const defaultState = {
  hero: {
    name: 'Pip', level: 1, xp: 0, xpNext: 20, gold: 32, potions: 1,
    attributes: { forca: 5, destreza: 5, inteligencia: 5, vitalidade: 5 },
    hp: 100, maxHp: 100, maxInventory: 20,
    equipment: { arma: null, capacete: null, armadura: null, botas: null, acessorio1: null, acessorio2: null },
  },
  monsters: [
    { id: 'slime', name: 'Slime Gelatinoso', level: 1, hp: 22, maxHp: 22, damage: 3, defense: 0, gold: 5, xp: 10, dropChance: 0.1, emoji: '🟢' },
    { id: 'rato', name: 'Rato de Esgoto', level: 1, hp: 18, maxHp: 18, damage: 4, defense: 0, gold: 4, xp: 8, dropChance: 0.1, emoji: '🐀' },
    { id: 'goblin', name: 'Goblin Ladrão', level: 2, hp: 40, maxHp: 40, damage: 6, defense: 1, gold: 10, xp: 18, dropChance: 0.14, emoji: '👺' },
    { id: 'lobo', name: 'Lobo Cinzento', level: 3, hp: 62, maxHp: 62, damage: 8, defense: 2, gold: 15, xp: 25, dropChance: 0.16, emoji: '🐺' },
    { id: 'esqueleto', name: 'Esqueleto Pé-de-Cabra', level: 4, hp: 88, maxHp: 88, damage: 11, defense: 3, gold: 23, xp: 36, dropChance: 0.18, emoji: '💀' },
  ],
  inventory: [
    { id: 'adaga', name: 'Adaga Enferrujada', slot: 'arma', rarity: 'Comum', skill: 'Veneno', value: 12, damage: 4 },
    { id: 'botas', name: 'Botas Remendadas', slot: 'botas', rarity: 'Comum', skill: 'Passo Sombrio', value: 10, dodge: 0.03 },
    { id: 'elmo', name: 'Elmo de Latão', slot: 'capacete', rarity: 'Raro', skill: 'Muralha', value: 22, defense: 2 },
  ],
  shop: [
    { id: 'pocao', name: 'Poção de vida', price: 15, type: 'potion' },
    { id: 'espada', name: 'Espada Larga do Guarda', price: 28, type: 'item', slot: 'arma', skill: 'Golpe Pesado', damage: 7, value: 24 },
    { id: 'amuleto', name: 'Amuleto do Coelho', price: 35, type: 'item', slot: 'acessorio1', skill: 'Faro de Tesouro', value: 30 },
  ],
  log: [
    { text: 'A jornada começa em Valeflore. A vila está tranquila e o herói está pronto para explorar.', type: 'info' },
    { text: 'Equipe itens para ativar suas habilidades durante o combate.', type: 'info' },
  ],
};

const state = structuredClone(defaultState);
const combat = {
  targetId: null,
  poisonTurns: 0,
  burnTurns: 0,
  shield: 0,
  shieldTurns: 0,
  dodgeTurns: 0,
  lifestealTurns: 0,
  stunTurns: 0,
  cooldowns: {},
};
let autoHunt = false;
let autoTargetId = 'slime';
let autoHuntTimer = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Não foi possível salvar o progresso.', error);
  }
}

function addLog(text, type = 'info') {
  state.log.unshift({ text, type });
  state.log = state.log.slice(0, 8);
}

function getItem(id) {
  return state.inventory.find((item) => item.id === id);
}

function getEquippedItems() {
  return Object.values(state.hero.equipment)
    .map(getItem)
    .filter(Boolean);
}

function getEquippedSkills() {
  return [...new Set(getEquippedItems().map((item) => item.skill).filter(Boolean))];
}

function getTotalOffense() {
  const weapon = getEquippedItems().find((item) => item.slot === 'arma');
  return state.hero.attributes.forca * 1.5 + (weapon?.damage || 0);
}

function getHeroDefense() {
  return getEquippedItems().reduce((total, item) => total + (item.defense || 0), 0);
}

function getDodgeChance() {
  const itemDodge = getEquippedItems().reduce((total, item) => total + (item.dodge || 0), 0);
  return clamp(state.hero.attributes.destreza * 0.005 + itemDodge, 0, 0.4);
}

function getTreasureBonus() {
  const treasureItems = getEquippedItems().filter((item) => item.skill === 'Faro de Tesouro').length;
  return { gold: treasureItems * 0.15, drop: treasureItems * 0.1 };
}

function getNextLevelXp(level) {
  return 20 * (level ** 2);
}

function levelUpIfNeeded() {
  while (state.hero.xp >= state.hero.xpNext) {
    state.hero.xp -= state.hero.xpNext;
    state.hero.level += 1;
    state.hero.xpNext = getNextLevelXp(state.hero.level);
    addLog(`Nível ${state.hero.level} alcançado! Você recebeu 3 pontos de atributo.`, 'success');
  }
}

function usePotion(automatic = false) {
  if (state.hero.potions <= 0 || state.hero.hp >= state.hero.maxHp) return false;
  const before = state.hero.hp;
  state.hero.potions -= 1;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 40);
  const recovered = state.hero.hp - before;
  addLog(`${automatic ? 'A IA usou' : 'Poção de vida consumida:'} ${automatic ? 'uma poção' : ''} e recuperou ${recovered} de vida.`, 'success');
  saveState();
  return true;
}

function buyItem(shopId) {
  const offer = state.shop.find((item) => item.id === shopId);
  if (!offer) return;
  if (state.hero.gold < offer.price) {
    addLog('Você não tem ouro suficiente para essa compra.', 'warning');
  } else if (offer.type === 'potion') {
    state.hero.gold -= offer.price;
    state.hero.potions += 1;
    addLog('Você comprou uma poção de vida.', 'success');
  } else {
    const carriedCount = state.inventory.filter((item) => !Object.values(state.hero.equipment).includes(item.id)).length;
    if (carriedCount >= state.hero.maxInventory) {
      addLog('A mochila está cheia. Venda ou equipe um item antes de comprar.', 'warning');
    } else {
      state.hero.gold -= offer.price;
      const purchased = { ...offer, id: `${offer.id}-${Date.now()}`, rarity: 'Comum' };
      delete purchased.price;
      delete purchased.type;
      state.inventory.push(purchased);
      addLog(`${offer.name} foi adicionado à mochila.`, 'success');
    }
  }
  saveState();
  render();
}

function getMonsterById(monsterId) {
  return state.monsters.find((monster) => monster.id === monsterId);
}

function resetCombatEffects(targetId) {
  if (combat.targetId === targetId) return;
  combat.targetId = targetId;
  combat.poisonTurns = 0;
  combat.burnTurns = 0;
  combat.shield = 0;
  combat.shieldTurns = 0;
  combat.dodgeTurns = 0;
  combat.lifestealTurns = 0;
  combat.stunTurns = 0;
  combat.cooldowns = {};
}

function awardMonster(monster) {
  const bonus = getTreasureBonus();
  const gold = Math.round(monster.gold * (1 + bonus.gold));
  state.hero.xp += monster.xp;
  state.hero.gold += gold;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 8);
  addLog(`${monster.name} derrotado! +${gold} ouro e +${monster.xp} XP.`, 'success');

  const dropChance = clamp((monster.dropChance || 0.1) + bonus.drop, 0, 0.75);
  if (Math.random() < dropChance) {
    const loot = [
      { name: 'Anel do Garimpeiro', slot: 'acessorio1', skill: 'Faro de Tesouro', value: 18 },
      { name: 'Amuleto de Musgo', slot: 'acessorio2', skill: 'Cura', value: 20 },
      { name: 'Cajado de Galho', slot: 'arma', skill: 'Bola de Fogo', value: 16, damage: 3 },
      { name: 'Anel do Vampiro Fraco', slot: 'acessorio1', skill: 'Sede de Sangue', value: 22 },
    ][Math.floor(Math.random() * 4)];
    const carriedCount = state.inventory.filter((item) => !Object.values(state.hero.equipment).includes(item.id)).length;
    if (carriedCount < state.hero.maxInventory) {
      state.inventory.push({ ...loot, id: `${loot.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`, rarity: 'Incomum' });
      addLog(`Encontrado: ${loot.name} (${loot.skill}).`, 'success');
    } else {
      state.hero.gold += loot.value;
      addLog(`A mochila estava cheia; ${loot.name} foi vendido automaticamente por ${loot.value} ouro.`, 'info');
    }
  }

  monster.hp = monster.maxHp;
  levelUpIfNeeded();
  combat.targetId = null;
}

function applyDamageOverTime(monster) {
  let damage = 0;
  if (combat.poisonTurns > 0) {
    const poisonDamage = Math.max(1, Math.round(2 + state.hero.attributes.inteligencia * 0.35));
    monster.hp = Math.max(0, monster.hp - poisonDamage);
    damage += poisonDamage;
    combat.poisonTurns -= 1;
  }
  if (combat.burnTurns > 0) {
    const burnDamage = Math.max(1, Math.round(3 + state.hero.attributes.inteligencia * 0.5));
    monster.hp = Math.max(0, monster.hp - burnDamage);
    damage += burnDamage;
    combat.burnTurns -= 1;
  }
  if (damage > 0) addLog(`Efeitos causam ${damage} de dano contínuo a ${monster.name}.`, 'info');
  return monster.hp <= 0;
}

function skillReady(skill) {
  return Boolean(skill) && (combat.cooldowns[skill] || 0) <= 0;
}

function chooseActiveSkill(skills) {
  const hpRatio = state.hero.hp / state.hero.maxHp;
  if (hpRatio <= 0.65 && skills.includes('Cura') && skillReady('Cura')) return 'Cura';
  if (hpRatio <= 0.55 && skills.includes('Muralha') && skillReady('Muralha')) return 'Muralha';
  if (hpRatio <= 0.45 && skills.includes('Passo Sombrio') && skillReady('Passo Sombrio')) return 'Passo Sombrio';
  for (const skill of ['Golpe Pesado', 'Bola de Fogo', 'Veneno', 'Sede de Sangue']) {
    if (skills.includes(skill) && skillReady(skill)) return skill;
  }
  return null;
}

function runActiveSkill(skill, monster) {
  const intelligence = state.hero.attributes.inteligencia;
  const baseDamage = Math.max(1, Math.round(getTotalOffense() - monster.defense));
  combat.cooldowns[skill] = 3;

  if (skill === 'Cura') {
    const amount = 18 + intelligence * 3;
    const recovered = Math.min(amount, state.hero.maxHp - state.hero.hp);
    state.hero.hp += recovered;
    addLog(`Cura recupera ${recovered} de vida.`, 'success');
    return 0;
  }
  if (skill === 'Muralha') {
    combat.shield = Math.max(combat.shield, 12 + state.hero.attributes.vitalidade * 2);
    combat.shieldTurns = 6;
    addLog(`Muralha ativa: ${combat.shield} de escudo por até 6 turnos.`, 'success');
    return 0;
  }
  if (skill === 'Passo Sombrio') {
    combat.dodgeTurns = 4;
    addLog('Passo Sombrio ativo: +30% de esquiva por 4 turnos.', 'success');
    return 0;
  }
  if (skill === 'Sede de Sangue') {
    combat.lifestealTurns = 5;
    const damage = baseDamage;
    monster.hp = Math.max(0, monster.hp - damage);
    const recovered = Math.min(Math.round(damage * 0.25), state.hero.maxHp - state.hero.hp);
    state.hero.hp += recovered;
    addLog(`Sede de Sangue causa ${damage} de dano e recupera ${recovered} de vida.`, 'success');
    return damage;
  }
  if (skill === 'Golpe Pesado') {
    const damage = Math.max(1, Math.round((getTotalOffense() * 2.5) - monster.defense));
    monster.hp = Math.max(0, monster.hp - damage);
    combat.stunTurns = 1;
    addLog(`Golpe Pesado causa ${damage} de dano e atordoa ${monster.name}.`, 'success');
    return damage;
  }
  if (skill === 'Bola de Fogo') {
    const damage = Math.max(1, 8 + intelligence * 2 - monster.defense);
    monster.hp = Math.max(0, monster.hp - damage);
    combat.burnTurns = Math.max(combat.burnTurns, 3);
    addLog(`Bola de Fogo causa ${damage} de dano e incendeia ${monster.name} por 3 turnos.`, 'success');
    return damage;
  }
  if (skill === 'Veneno') {
    monster.hp = Math.max(0, monster.hp - baseDamage);
    combat.poisonTurns = Math.max(combat.poisonTurns, 5);
    addLog(`Veneno causa ${baseDamage} de dano e fica ativo por 5 turnos.`, 'success');
    return baseDamage;
  }
  return 0;
}

function attackMonster(monsterId) {
  const monster = getMonsterById(monsterId);
  if (!monster) return;
  resetCombatEffects(monsterId);

  for (const skill of Object.keys(combat.cooldowns)) {
    combat.cooldowns[skill] = Math.max(0, combat.cooldowns[skill] - 1);
  }

  if (applyDamageOverTime(monster)) {
    awardMonster(monster);
    saveState();
    render();
    return;
  }

  const skills = getEquippedSkills();
  const skill = chooseActiveSkill(skills);
  let damage;
  if (skill) {
    damage = runActiveSkill(skill, monster);
  } else {
    damage = Math.max(1, Math.round(getTotalOffense() + 4 + Math.random() * 5 - monster.defense));
    monster.hp = Math.max(0, monster.hp - damage);
    if (combat.lifestealTurns > 0) {
      const recovered = Math.min(Math.round(damage * 0.25), state.hero.maxHp - state.hero.hp);
      state.hero.hp += recovered;
      addLog(`Ataque causa ${damage} de dano; roubo de vida recupera ${recovered} HP.`, 'success');
    } else {
      addLog(`${state.hero.name} ataca ${monster.name} e causa ${damage} de dano.`, 'info');
    }
  }

  if (monster.hp <= 0) {
    awardMonster(monster);
    saveState();
    render();
    return;
  }

  if (combat.stunTurns > 0) {
    combat.stunTurns -= 1;
    addLog(`${monster.name} está atordoado e perde o turno.`, 'info');
  } else {
    const dodgeChance = getDodgeChance() + (combat.dodgeTurns > 0 ? 0.3 : 0);
    if (Math.random() < Math.min(0.7, dodgeChance)) {
      addLog(`Você esquivou do ataque de ${monster.name}!`, 'success');
    } else {
      let incoming = Math.max(1, monster.damage - getHeroDefense());
      if (combat.shieldTurns > 0 && combat.shield > 0) {
        const absorbed = Math.min(incoming, combat.shield);
        incoming -= absorbed;
        combat.shield -= absorbed;
        addLog(`O escudo absorve ${absorbed} de dano.`, 'info');
      }
      if (incoming > 0) {
        state.hero.hp = Math.max(0, state.hero.hp - incoming);
        addLog(`${monster.name} causa ${incoming} de dano.`, 'danger');
      }
    }
  }

  if (combat.shieldTurns > 0) combat.shieldTurns -= 1;
  if (combat.dodgeTurns > 0) combat.dodgeTurns -= 1;
  if (combat.lifestealTurns > 0) combat.lifestealTurns -= 1;

  if (state.hero.hp <= 0) {
    state.hero.hp = state.hero.maxHp;
    combat.targetId = null;
    addLog('O herói caiu e voltou à vila com a vida reabastecida.', 'warning');
    if (autoHunt) stopAutoHunt('Caça automática pausada após a derrota.');
  }

  saveState();
  render();
}

function stopAutoHunt(message = 'Caça automática pausada.') {
  autoHunt = false;
  if (autoHuntTimer !== null) {
    clearInterval(autoHuntTimer);
    autoHuntTimer = null;
  }
  if (message) addLog(message, 'warning');
  saveState();
  render();
}

function selectLevelTarget() {
  const available = state.monsters.filter((monster) => monster.level <= state.hero.level);
  const eligible = available.length ? available : state.monsters;
  return eligible.reduce((best, monster) => monster.level > best.level ? monster : best);
}

function runAutoHuntTick() {
  if (!autoHunt) return;
  if (autoTargetId === 'nivel') autoTargetId = selectLevelTarget().id;
  const maxHp = 50 + state.hero.attributes.vitalidade * 10;
  if (state.hero.hp <= maxHp * 0.25) {
    if (state.hero.potions > 0 && state.hero.hp <= maxHp * 0.5) {
      usePotion(true);
    } else {
      stopAutoHunt('Caça automática pausada: vida baixa e sem poções.');
      return;
    }
  } else if (state.hero.potions > 0 && state.hero.hp <= maxHp * 0.35) {
    usePotion(true);
  }
  attackMonster(autoTargetId);
}

function toggleAutoHunt() {
  if (autoHunt) {
    stopAutoHunt('Caça automática interrompida.');
    return;
  }
  const targetSelect = document.querySelector('#auto-target');
  autoTargetId = targetSelect?.value || 'nivel';
  if (autoTargetId === 'nivel') autoTargetId = selectLevelTarget().id;
  if (!getMonsterById(autoTargetId)) {
    addLog('Escolha um monstro válido para iniciar a caça.', 'warning');
    render();
    return;
  }
  autoHunt = true;
  addLog(`Caça automática iniciada: ${targetSelect?.value === 'nivel' ? 'alvo recomendado pelo seu nível' : getMonsterById(autoTargetId).name}.`, 'success');
  autoHuntTimer = window.setInterval(runAutoHuntTick, AUTO_HUNT_INTERVAL);
  saveState();
  render();
}

function equipItem(itemId) {
  const item = getItem(itemId);
  if (!item) return;
  let slot = item.slot;
  if (slot === 'acessorio') slot = !state.hero.equipment.acessorio1 ? 'acessorio1' : 'acessorio2';
  if (!Object.hasOwn(state.hero.equipment, slot)) {
    addLog('Este item não tem um espaço de equipamento válido.', 'warning');
    return;
  }
  state.hero.equipment[slot] = item.id;
  addLog(`${item.name} equipado. Habilidade: ${item.skill || 'nenhuma'}.`, 'success');
  saveState();
  render();
}

function unequipItem(slot) {
  if (!state.hero.equipment[slot]) return;
  const item = getItem(state.hero.equipment[slot]);
  state.hero.equipment[slot] = null;
  addLog(`${item?.name || 'Item'} removido do equipamento.`, 'info');
  saveState();
  render();
}

function sellItem(itemId) {
  const item = getItem(itemId);
  if (!item) return;
  if (Object.values(state.hero.equipment).includes(itemId)) {
    addLog('Remova o item do equipamento antes de vendê-lo.', 'warning');
    render();
    return;
  }
  state.hero.gold += item.value || 1;
  state.inventory = state.inventory.filter((entry) => entry.id !== itemId);
  addLog(`${item.name} foi vendido por ${item.value || 1} ouro.`, 'info');
  saveState();
  render();
}

function boostAttribute(key) {
  const spent = state.hero.level - 1;
  const allocated = Object.values(state.hero.attributes).reduce((sum, value) => sum + value, 0) - 20;
  if (spent * 3 - allocated <= 0) {
    addLog('Você não tem pontos de atributo disponíveis.', 'warning');
    return;
  }
  state.hero.attributes[key] += 1;
  state.hero.maxHp = 50 + state.hero.attributes.vitalidade * 10;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + (key === 'vitalidade' ? 10 : 0));
  addLog(`${key.toUpperCase()} aumentou para ${state.hero.attributes[key]}.`, 'success');
  saveState();
  render();
}

function render() {
  const app = document.querySelector('#app');
  const hero = state.hero;
  const heroMaxHp = 50 + hero.attributes.vitalidade * 10;
  const hpPercent = clamp((hero.hp / heroMaxHp) * 100, 0, 100);
  const xpPercent = clamp((hero.xp / hero.xpNext) * 100, 0, 100);
  const equippedIds = Object.values(hero.equipment);
  const carriedItems = state.inventory.filter((item) => !equippedIds.includes(item.id));
  const skills = getEquippedSkills();
  const treasure = getTreasureBonus();

  app.innerHTML = `
    <div class="dashboard">
      <header class="topbar">
        <div class="title-wrap"><span>RPG Idle</span><h1>Masmorras do Vale do Musgo</h1></div>
        <div class="topbar-metrics">
          <div class="metric-pill"><small>Ouro</small><strong>${hero.gold}</strong></div>
          <div class="metric-pill"><small>XP</small><strong>${hero.xp}/${hero.xpNext}</strong></div>
          <div class="metric-pill"><small>Poções</small><strong>${hero.potions}</strong></div>
        </div>
      </header>
      <main class="main-grid">
        <section class="panel">
          <div class="panel-header"><h2>Herói</h2><span class="tag rarity">Nível ${hero.level}</span></div>
          <div class="hero-panel">
            <div class="hero-card">
              <div class="avatar" aria-label="Avatar do herói">⚔️</div>
              <div class="hero-meta">
                <h3>${hero.name}</h3><p>Sem classe • explorador do vale</p>
                <div class="hero-stats">
                  <div class="stat-box"><span>FOR</span><strong>${hero.attributes.forca}</strong></div>
                  <div class="stat-box"><span>DES</span><strong>${hero.attributes.destreza}</strong></div>
                  <div class="stat-box"><span>INT</span><strong>${hero.attributes.inteligencia}</strong></div>
                  <div class="stat-box"><span>VIT</span><strong>${hero.attributes.vitalidade}</strong></div>
                </div>
              </div>
            </div>
            <div class="progress-block"><div class="progress-label"><span>Vida</span><span>${hero.hp}/${heroMaxHp}</span></div><div class="progress-bar hp"><span style="width:${hpPercent}%"></span></div></div>
            <div class="progress-block"><div class="progress-label"><span>Experiência</span><span>${hero.xp}/${hero.xpNext}</span></div><div class="progress-bar"><span style="width:${xpPercent}%"></span></div></div>
            <p class="combat-summary">Dano ${Math.round(getTotalOffense())} • Defesa ${getHeroDefense()} • Esquiva ${Math.round(getDodgeChance() * 100)}%${treasure.gold ? ` • Bônus de ouro +${Math.round(treasure.gold * 100)}%` : ''}</p>
            <div class="secondary-grid">
              <div class="panel action-panel">
                <div class="panel-header"><h3>Ações</h3></div>
                <div class="auto-hunt-controls" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <label for="auto-target" class="sr-only">Monstro para caça automática</label>
                  <select id="auto-target" aria-label="Escolha o monstro para caça automática" ${autoHunt ? 'disabled' : ''}>
                    <option value="nivel" ${autoHunt && autoTargetId === selectLevelTarget().id ? 'selected' : ''}>🧭 Melhor alvo para meu nível</option>
                    ${state.monsters.map((monster) => `<option value="${monster.id}" ${autoHunt && monster.id === autoTargetId ? 'selected' : ''}>${monster.emoji} Nv. ${monster.level} — ${monster.name}</option>`).join('')}
                  </select>
                  <button class="action-btn ${autoHunt ? 'warning' : 'primary'}" data-action="auto-hunt" aria-pressed="${autoHunt}">${autoHunt ? '⏸ Pausar caça' : '▶ Caça automática'}</button>
                </div>
                <p class="hunt-status" role="status" aria-live="polite">${autoHunt ? `Caçando ${autoTargetId === selectLevelTarget().id ? 'o melhor alvo para seu nível' : getMonsterById(autoTargetId)?.name}. A IA usa poções e pausa com vida crítica.` : 'A IA escolhe o alvo pelo nível, usa habilidades equipadas e tenta se curar.'}</p>
                <ul class="action-list" style="margin-top:14px;">
                  <li><button class="action-btn primary" data-action="attack">Caçar uma vez</button></li>
                  <li><button class="action-btn warning" data-action="potion">Usar poção</button></li>
                  ${Object.entries(hero.attributes).map(([key]) => `<li><button class="action-btn" data-action="boost" data-attribute="${key}">+ ${key.toUpperCase()}</button></li>`).join('')}
                </ul>
                ${skills.length ? `<p class="skill-summary">Habilidades equipadas: ${skills.join(' • ')}</p>` : '<p class="skill-summary">Equipe seus itens para ativar habilidades de combate.</p>'}
                <div class="monster-list">
                  ${state.monsters.map((monster) => `
                    <div class="monster-card" data-monster-id="${monster.id}">
                      <div class="monster-name"><strong>${monster.emoji} ${monster.name}</strong><span>Nível ${monster.level} • ${monster.hp}/${monster.maxHp} HP • dano ${monster.damage}</span></div>
                      <div class="monster-meta"><span class="monster-badge">+${monster.xp} XP</span><button class="action-btn" data-action="fight" data-monster-id="${monster.id}">Atacar</button></div>
                    </div>`).join('')}
                </div>
              </div>
              <div class="panel shop-panel">
                <div class="panel-header"><h3>Loja da vila</h3></div>
                <ul class="shop-list" style="margin-top:14px;display:grid;gap:10px;">
                  ${state.shop.map((item) => `<li class="item-box"><div class="item-info"><strong>${item.name}</strong><small>${item.type === 'potion' ? 'Recupera até 40 de vida' : `${item.skill} • equipamento`}</small></div><button class="shop-btn" data-action="buy" data-buy-id="${item.id}">${item.price} ouro</button></li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </section>
        <aside class="panel">
          <div class="panel-header"><h2>Inventário</h2><span class="tag">${carriedItems.length}/${hero.maxInventory}</span></div>
          <div class="inventory-panel">
            <div class="panel-header" style="padding:0 0 12px;border:0;margin-bottom:12px;"><h3>Equipamentos</h3></div>
            <ul class="equipment-list" style="display:grid;gap:10px;">
              ${['arma', 'capacete', 'armadura', 'botas', 'acessorio1', 'acessorio2'].map((slot) => {
                const item = getItem(hero.equipment[slot]);
                return `<li class="slot-box"><div class="slot-info"><strong>${slot}</strong><small>${item ? `${item.name} • ${item.skill || 'sem habilidade'}` : 'Vazio'}</small></div>${item ? `<button class="inventory-btn" data-action="unequip" data-slot="${slot}">Remover</button>` : ''}</li>`;
              }).join('')}
            </ul>
            <div class="panel-header" style="padding:0 0 12px;border:0;margin:18px 0 12px;"><h3>Itens na mochila</h3></div>
            <ul class="inventory-list" style="display:grid;gap:10px;">
              ${carriedItems.length ? carriedItems.map((item) => `<li class="item-box"><div class="item-info"><strong>${item.name}</strong><small>${item.skill || 'Sem habilidade'} • ${item.rarity || 'Comum'}</small></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;"><button class="inventory-btn" data-action="equip" data-item-id="${item.id}">Equipar</button><button class="inventory-btn" data-action="sell" data-item-id="${item.id}">Vender</button></div></li>`).join('') : '<li class="item-box"><div class="item-info"><strong>Mochila vazia</strong><small>Itens encontrados aparecerão aqui.</small></div></li>'}
            </ul>
          </div>
          <div class="panel-header" style="margin-top:18px;"><h2>Registro</h2></div>
          <div class="log-panel"><ul class="log-list">${state.log.map((entry) => `<li class="log-item"><strong>${entry.type === 'success' ? '✔' : entry.type === 'danger' ? '⚠' : '•'}</strong> ${entry.text}</li>`).join('')}</ul></div>
        </aside>
      </main>
    </div>`;

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const { action } = button.dataset;
      if (action === 'fight') attackMonster(button.dataset.monsterId);
      if (action === 'buy') buyItem(button.dataset.buyId);
      if (action === 'equip') equipItem(button.dataset.itemId);
      if (action === 'unequip') unequipItem(button.dataset.slot);
      if (action === 'sell') sellItem(button.dataset.itemId);
      if (action === 'potion') { usePotion(); render(); }
      if (action === 'auto-hunt') toggleAutoHunt();
      if (action === 'boost') boostAttribute(button.dataset.attribute);
      if (action === 'attack') attackMonster(selectLevelTarget().id);
      if (action === 'shop') addLog('A loja da vila está aberta.', 'info');
    });
  });
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      Object.assign(state, parsed);
      state.hero = { ...defaultState.hero, ...(parsed.hero || {}), attributes: { ...defaultState.hero.attributes, ...(parsed.hero?.attributes || {}) }, equipment: { ...defaultState.hero.equipment, ...(parsed.hero?.equipment || {}) } };
      state.monsters = Array.isArray(parsed.monsters) ? parsed.monsters : defaultState.monsters;
      state.inventory = Array.isArray(parsed.inventory) ? parsed.inventory : defaultState.inventory;
      state.shop = Array.isArray(parsed.shop) ? parsed.shop : defaultState.shop;
      state.log = Array.isArray(parsed.log) ? parsed.log : defaultState.log;
    }
  }
} catch (error) {
  console.warn('Não foi possível restaurar o progresso salvo.', error);
}

state.hero.maxHp = 50 + state.hero.attributes.vitalidade * 10;
state.hero.hp = clamp(state.hero.hp, 0, state.hero.maxHp);
state.hero.xpNext = getNextLevelXp(state.hero.level);
render();

window.addEventListener('beforeunload', saveState);
window.setInterval(() => {
  if (state.hero.hp < state.hero.maxHp) {
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 1);
    saveState();
    render();
  }
}, 1300);

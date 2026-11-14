const STORAGE_KEY = 'rpg-idle-masmorras';
const TREE_KEY = 'rpg-idle-skill-tree-v1';
const POINT_INTERVAL = 30;

const branches = [
  {
    id: 'lamina', name: 'Caminho da Lâmina', icon: '⚔️', theme: 'blade',
    nodes: [
      { id: 'veneno', name: 'Lâmina Venenosa', skill: 'Veneno', item: { name: 'Adaga do Aprendiz', slot: 'arma', damage: 2, skill: 'Veneno', value: 8 }, description: 'Desbloqueia Veneno: dano inicial ao atacar.', },
      { id: 'golpe', name: 'Golpe Devastador', skill: 'Golpe Pesado', requires: 'veneno', item: { name: 'Espada do Duelista', slot: 'arma', damage: 5, skill: 'Golpe Pesado', value: 18 }, description: 'Desbloqueia um golpe pesado com maior dano.', },
      { id: 'sangue', name: 'Fome de Batalha', skill: 'Sede de Sangue', requires: 'golpe', item: { name: 'Anel do Duelista', slot: 'acessorio1', skill: 'Sede de Sangue', value: 20 }, description: 'Aumenta o ataque em combate prolongado.', },
    ],
  },
  {
    id: 'arcano', name: 'Caminho Arcano', icon: '✦', theme: 'arcane',
    nodes: [
      { id: 'fogo', name: 'Faísca Arcana', skill: 'Bola de Fogo', item: { name: 'Cajado de Faísca', slot: 'arma', damage: 2, skill: 'Bola de Fogo', value: 12 }, description: 'Desbloqueia Bola de Fogo para dano mágico.', },
      { id: 'cura', name: 'Restauração', skill: 'Cura', requires: 'fogo', item: { name: 'Amuleto Restaurador', slot: 'acessorio2', skill: 'Cura', value: 18 }, description: 'Desbloqueia Cura para recuperar vida.', },
    ],
  },
  {
    id: 'guardiao', name: 'Caminho do Guardião', icon: '⬡', theme: 'guard',
    nodes: [
      { id: 'muralha', name: 'Muralha de Ferro', skill: 'Muralha', item: { name: 'Broquel do Guardião', slot: 'capacete', defense: 2, skill: 'Muralha', value: 14 }, description: 'Desbloqueia Muralha para aumentar a defesa.', },
      { id: 'passo', name: 'Passo Sombrio', skill: 'Passo Sombrio', requires: 'muralha', item: { name: 'Botas do Batedor', slot: 'botas', dodge: 0.06, skill: 'Passo Sombrio', value: 16 }, description: 'Melhora a evasão contra ataques rápidos.', },
    ],
  },
];

const iconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M11 7 7 16m6-9 4 9m-9 2h8"/></svg>';
const toolbar = document.querySelector('.game-toolbar');
const frame = document.querySelector('#world-demo .world-frame');
const app = document.querySelector('#app');
if (!toolbar || !frame || !app) throw new Error('Não foi possível iniciar a árvore de habilidades.');

const existingTalentButton = toolbar.querySelector('[data-panel="talents"]');
if (!existingTalentButton) {
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'toolbar-button skill-tree-trigger';
  openButton.dataset.skillTreeOpen = 'true';
  openButton.title = 'Talentos';
  openButton.setAttribute('aria-label', 'Abrir talentos');
  openButton.setAttribute('aria-expanded', 'false');
  openButton.innerHTML = `${iconSvg}<span>Talentos</span>`;
  toolbar.append(openButton);
}

const panel = document.createElement('section');
panel.className = 'skill-tree-panel';
panel.hidden = true;
panel.setAttribute('aria-label', 'Árvore de habilidades e maestria');
panel.innerHTML = `
  <header class="skill-tree-header">
    <div><span class="skill-eyebrow">PROGRESSÃO DE COMBATE</span><h2>Árvore de habilidades</h2></div>
    <button class="skill-tree-close" type="button" aria-label="Fechar árvore">×</button>
  </header>
  <div class="mastery-overview">
    <div><span>Maestria de combate</span><strong class="mastery-value">0 / ${POINT_INTERVAL} XP</strong></div>
    <div class="mastery-progress"><span></span></div>
    <div class="mastery-footer"><span class="mastery-points">0 pontos</span><span class="mastery-kills">0 abates</span></div>
  </div>
  <div class="skill-branches"></div>
  <p class="skill-tree-note">Cada habilidade desbloqueada adiciona um equipamento à mochila. Equipe-o no inventário para usar a habilidade no combate.</p>
`;
frame.append(panel);

let treeState = loadTreeState();
let lastKillText = document.querySelector('#app .log-item')?.textContent.trim() || '';

function loadTreeState() {
  try {
    const saved = JSON.parse(localStorage.getItem(TREE_KEY) || '{}');
    return {
      masteryXp: Number.isFinite(saved.masteryXp) ? saved.masteryXp : 0,
      points: Number.isFinite(saved.points) ? saved.points : 0,
      kills: Number.isFinite(saved.kills) ? saved.kills : 0,
      unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
    };
  } catch {
    return { masteryXp: 0, points: 0, kills: 0, unlocked: [] };
  }
}

function saveTreeState() {
  localStorage.setItem(TREE_KEY, JSON.stringify(treeState));
}

function refreshMastery() {
  const progress = treeState.masteryXp % POINT_INTERVAL;
  panel.querySelector('.mastery-value').textContent = `${progress} / ${POINT_INTERVAL} XP`;
  panel.querySelector('.mastery-progress span').style.width = `${(progress / POINT_INTERVAL) * 100}%`;
  panel.querySelector('.mastery-points').textContent = `${treeState.points} ${treeState.points === 1 ? 'ponto' : 'pontos'} disponíveis`;
  panel.querySelector('.mastery-kills').textContent = `${treeState.kills} ${treeState.kills === 1 ? 'abate' : 'abates'}`;
}

function renderTree() {
  const container = panel.querySelector('.skill-branches');
  container.replaceChildren();
  for (const branch of branches) {
    const section = document.createElement('section');
    section.className = `skill-branch ${branch.theme}`;
    const heading = document.createElement('h3');
    heading.innerHTML = `<span aria-hidden="true">${branch.icon}</span>${branch.name}`;
    section.append(heading);

    const nodes = document.createElement('div');
    nodes.className = 'skill-nodes';
    for (const node of branch.nodes) {
      const unlocked = treeState.unlocked.includes(node.id);
      const prerequisiteMet = !node.requires || treeState.unlocked.includes(node.requires);
      const card = document.createElement('article');
      card.className = `skill-node${unlocked ? ' unlocked' : ''}${!unlocked && !prerequisiteMet ? ' locked' : ''}`;
      const title = document.createElement('strong');
      title.textContent = node.name;
      const description = document.createElement('p');
      description.textContent = node.description;
      const skill = document.createElement('span');
      skill.className = 'skill-tag';
      skill.textContent = node.skill;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skill-unlock-button';
      button.dataset.unlockSkill = node.id;
      button.disabled = unlocked || !prerequisiteMet || treeState.points < 1;
      button.textContent = unlocked ? 'Desbloqueada' : !prerequisiteMet ? 'Requer nó anterior' : 'Desbloquear · 1 ponto';
      card.append(title, description, skill, button);
      nodes.append(card);
    }
    section.append(nodes);
    container.append(section);
  }
  refreshMastery();
}

function getStoredGameState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function grantTrainingItem(node) {
  const gameState = getStoredGameState();
  if (!gameState || !gameState.hero || !Array.isArray(gameState.inventory)) {
    return 'O jogo ainda não salvou um personagem. Tente novamente após a primeira ação.';
  }
  const alreadyOwned = gameState.inventory.some((item) => item.id === `maestria-${node.id}`);
  if (alreadyOwned) return null;

  const equippedIds = Object.values(gameState.hero.equipment || {});
  const carried = gameState.inventory.filter((item) => !equippedIds.includes(item.id)).length;
  if (carried >= (gameState.hero.maxInventory || 20)) return 'Mochila cheia. Libere um espaço antes de desbloquear este equipamento.';

  gameState.inventory.push({ id: `maestria-${node.id}`, rarity: 'Incomum', ...node.item });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  return null;
}

function unlockNode(nodeId) {
  const node = branches.flatMap((branch) => branch.nodes).find((candidate) => candidate.id === nodeId);
  if (!node || treeState.unlocked.includes(nodeId) || treeState.points < 1) return;
  if (node.requires && !treeState.unlocked.includes(node.requires)) return;

  const error = grantTrainingItem(node);
  if (error) {
    window.alert(error);
    return;
  }

  treeState.points -= 1;
  treeState.unlocked.push(nodeId);
  saveTreeState();
  renderTree();
  window.dispatchEvent(new CustomEvent('rpg:skill-unlocked', { detail: { nodeId, skill: node.skill } }));
}

function recordLatestKill() {
  const latest = document.querySelector('#app .log-item')?.textContent.trim();
  if (!latest || latest === lastKillText) return;
  lastKillText = latest;
  const reward = latest.match(/derrotado!\s*\+\d+\s*ouro\s*e\s*\+(\d+)\s*XP/i);
  if (!reward) return;

  const oldPoints = Math.floor(treeState.masteryXp / POINT_INTERVAL);
  treeState.kills += 1;
  treeState.masteryXp += Number(reward[1]);
  const earned = Math.floor(treeState.masteryXp / POINT_INTERVAL) - oldPoints;
  if (earned > 0) {
    treeState.points += earned;
    window.dispatchEvent(new CustomEvent('rpg:skill-points-earned', { detail: { points: earned } }));
  }
  saveTreeState();
  renderTree();
}

function openTree() {
  panel.hidden = !panel.hidden;
  const trigger = toolbar.querySelector('.skill-tree-trigger, [data-panel="talents"]');
  if (trigger) {
    trigger.classList.toggle('is-active', !panel.hidden);
    trigger.setAttribute('aria-expanded', String(!panel.hidden));
  }
  if (!panel.hidden) renderTree();
}

window.__rpgOpenTalentTree = openTree;

const talentButton = toolbar.querySelector('.skill-tree-trigger, [data-panel="talents"]');
if (talentButton) {
  talentButton.addEventListener('click', (event) => {
    event.preventDefault();
    openTree();
  });
}
panel.querySelector('.skill-tree-close').addEventListener('click', openTree);
panel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-unlock-skill]');
  if (button) unlockNode(button.dataset.unlockSkill);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) openTree();
});

const gameApp = document.querySelector('#app');
if (gameApp) new MutationObserver(recordLatestKill).observe(gameApp, { childList: true, subtree: true, characterData: true });
renderTree();

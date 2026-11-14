const app = document.querySelector('#app');
const frame = document.querySelector('#world-demo .world-frame');
if (!app || !frame) throw new Error('Não foi possível iniciar a barra de interface.');

const icons = {
  status: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.5-3.5 2.8-5.3 6.5-5.3s6 1.8 6.5 5.3M19 5v6m-3-3h6"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 5.5 20h13L20 8.5M3 5h18v4H3zM10 12h4"/></svg>',
  talents: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="4"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20"/></svg>',
  forge: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10l2 2v9l-2 2H7l-2-2V8l2-2zm2 7h6M8 4V2m8 2V2"/><path d="m12 3 2 3 2 4-4 4-4-4 2-4 2-3z"/></svg>',
  trade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l2 3v8H5v-8l2-3Zm0 0V5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V8M10 12h4"/></svg>',
  hunt: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="16" cy="8" r="3"/><path d="M4 20 9 15m-4-7 6 6M8 5l11 14"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

const toolbar = document.createElement('nav');
toolbar.className = 'game-toolbar';
toolbar.setAttribute('aria-label', 'Menus do jogo');
toolbar.innerHTML = `
  <button type="button" class="toolbar-button" data-panel="status" aria-label="Abrir status" aria-controls="game-hud-panel" aria-expanded="false" title="Status">${icons.status}<span>Status</span></button>
  <button type="button" class="toolbar-button" data-panel="inventory" aria-label="Abrir inventário" aria-controls="game-hud-panel" aria-expanded="false" title="Inventário">${icons.inventory}<span>Inventário</span></button>
  <button type="button" class="toolbar-button" data-panel="talents" aria-label="Abrir talentos" aria-controls="game-hud-panel" aria-expanded="false" title="Talentos">${icons.talents}<span>Talentos</span></button>
  <button type="button" class="toolbar-button" data-panel="map" aria-label="Abrir mapa" aria-controls="game-hud-panel" aria-expanded="false" title="Mapa">${icons.map}<span>Mapa</span></button>
  <button type="button" class="toolbar-button" data-panel="forge" aria-label="Abrir ferreiro" aria-controls="game-hud-panel" aria-expanded="false" title="Ferreiro">${icons.forge}<span>Ferreiro</span></button>
  <button type="button" class="toolbar-button" data-panel="trade" aria-label="Abrir comércio" aria-controls="game-hud-panel" aria-expanded="false" title="Comércio">${icons.trade}<span>Comércio</span></button>
  <button type="button" class="toolbar-button" data-panel="hunt" aria-label="Abrir caça automática" aria-controls="game-hud-panel" aria-expanded="false" title="Caça automática">${icons.hunt}<span>Caça</span></button>
`;

const panel = document.createElement('section');
panel.className = 'game-hud-panel';
panel.id = 'game-hud-panel';
panel.hidden = true;
panel.setAttribute('aria-live', 'polite');
panel.innerHTML = '<header class="game-hud-panel-header"><h2></h2><button type="button" class="hud-close" aria-label="Fechar painel">' + icons.close + '</button></header><div class="game-hud-panel-content"></div>';
frame.append(toolbar, panel);

let activePanel = null;
let refreshQueued = false;

function findSourcePanel(name) {
  if (name === 'status') return app.querySelector('.main-grid > section');
  if (name === 'inventory') return app.querySelector('.inventory-panel');
  if (name === 'forge' || name === 'trade') return app.querySelector('.shop-panel');
  if (name === 'hunt') return app.querySelector('.action-panel');
  return null;
}

function buildMapPanel() {
  const wrapper = document.createElement('div');
  wrapper.className = 'floating-map-panel';
  wrapper.innerHTML = `
    <div class="panel-kicker">REGIÃO ATUAL</div>
    <h3>Vale do Musgo</h3>
    <p>Vieiras, clareiras e trilhas em torno da base do aventureiro.</p>
    <ul>
      <li>Zona segura</li>
      <li>Monstros em rota de caça</li>
      <li>Expansão marcada para próximos setores</li>
    </ul>
  `;
  return wrapper;
}

function refreshPanel() {
  refreshQueued = false;
  if (!activePanel) return;
  const content = panel.querySelector('.game-hud-panel-content');
  const heading = panel.querySelector('h2');
  content.replaceChildren();

  const titles = {
    status: 'Status',
    inventory: 'Inventário',
    talents: 'Talentos',
    map: 'Mapa',
    forge: 'Ferreiro',
    trade: 'Comércio',
    hunt: 'Caça automática',
  };
  heading.textContent = titles[activePanel] || 'Menu';

  if (activePanel === 'map') {
    content.append(buildMapPanel());
    return;
  }

  if (activePanel === 'talents') {
    const talentTrigger = document.querySelector('.skill-tree-trigger');
    if (talentTrigger) talentTrigger.click();
    closePanel();
    return;
  }

  const source = findSourcePanel(activePanel);
  if (!source) return;

  if (activePanel === 'hunt') {
    for (const selector of ['.auto-hunt-controls', '.hunt-status', '.action-list', '.monster-list']) {
      const section = source.querySelector(selector);
      if (section) content.append(section.cloneNode(true));
    }
    return;
  }

  if (activePanel === 'forge' || activePanel === 'trade') {
    const clone = source.cloneNode(true);
    clone.classList.add('hud-source-clone');
    content.append(clone);
    return;
  }

  const clone = source.cloneNode(true);
  clone.classList.add('hud-source-clone');
  content.append(clone);
}

function openPanel(name) {
  if (activePanel === name) {
    closePanel();
    return;
  }

  if (name === 'talents') {
    const talentTrigger = document.querySelector('.skill-tree-trigger');
    if (talentTrigger) {
      talentTrigger.click();
      return;
    }
  }

  activePanel = name;
  panel.hidden = false;
  toolbar.querySelectorAll('[data-panel]').forEach((button) => {
    const selected = button.dataset.panel === name;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-expanded', String(selected));
  });
  refreshPanel();
}

function closePanel() {
  activePanel = null;
  panel.hidden = true;
  toolbar.querySelectorAll('[data-panel]').forEach((button) => {
    button.classList.remove('is-active');
    button.setAttribute('aria-expanded', 'false');
  });
}

function forwardAction(button) {
  const action = button.dataset.action;
  if (!action) return;
  const fields = ['itemId', 'slot', 'buyId', 'monsterId', 'attribute'];
  const original = [...app.querySelectorAll('[data-action]')].find((candidate) =>
    candidate.dataset.action === action && fields.every((field) => candidate.dataset[field] === button.dataset[field])
  );
  original?.click();
}

toolbar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-panel]');
  if (button) openPanel(button.dataset.panel);
});
panel.querySelector('.hud-close').addEventListener('click', closePanel);
panel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) forwardAction(button);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activePanel) closePanel();
});
new MutationObserver(() => {
  if (activePanel && !refreshQueued) {
    refreshQueued = true;
    requestAnimationFrame(refreshPanel);
  }
}).observe(app, { childList: true, subtree: true });

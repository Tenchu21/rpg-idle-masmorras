const app = document.querySelector('#app');
const frame = document.querySelector('#world-demo .world-frame');
if (!app || !frame) throw new Error('Não foi possível iniciar a barra de interface.');

const icons = {
  hunt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 9 15m-4-7 6 6m5-12 4 4m-6 7 6 6M8 5l11 14"/><circle cx="16" cy="8" r="3"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 5.5 20h13L20 8.5M3 5h18v4H3zM10 12h4"/></svg>',
  shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.3 11H5.3L4 9Zm-1-4h18l-1 4H4L3 5Zm6 8v7m6-7v7"/><path d="M9 5a3 3 0 0 1 6 0"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

const toolbar = document.createElement('nav');
toolbar.className = 'game-toolbar';
toolbar.setAttribute('aria-label', 'Menus do jogo');
toolbar.innerHTML = `
  <button type="button" class="toolbar-button" data-panel="hunt" aria-label="Abrir caça automática" aria-controls="game-hud-panel" aria-expanded="false" title="Caça automática">${icons.hunt}<span>Caça</span></button>
  <button type="button" class="toolbar-button" data-panel="inventory" aria-label="Abrir inventário" aria-controls="game-hud-panel" aria-expanded="false" title="Inventário">${icons.inventory}<span>Inventário</span></button>
  <button type="button" class="toolbar-button" data-panel="shop" aria-label="Abrir loja" aria-controls="game-hud-panel" aria-expanded="false" title="Loja">${icons.shop}<span>Loja</span></button>`;

const panel = document.createElement('section');
panel.className = 'game-hud-panel';
panel.id = 'game-hud-panel';
panel.hidden = true;
panel.setAttribute('aria-live', 'polite');
panel.innerHTML = `<header class="game-hud-panel-header"><h2></h2><button type="button" class="hud-close" aria-label="Fechar painel">${icons.close}</button></header><div class="game-hud-panel-content"></div>`;
frame.append(toolbar, panel);

let activePanel = null;
let refreshQueued = false;

function findSource(name) {
  if (name === 'hunt') return app.querySelector('.action-panel');
  if (name === 'inventory') return app.querySelector('.inventory-panel');
  if (name === 'shop') return app.querySelector('.shop-panel');
  return null;
}

function refreshPanel() {
  refreshQueued = false;
  if (!activePanel) return;
  const content = panel.querySelector('.game-hud-panel-content');
  const heading = panel.querySelector('h2');
  content.replaceChildren();
  heading.textContent = { hunt: 'Caça automática', inventory: 'Inventário', shop: 'Loja' }[activePanel];
  const source = findSource(activePanel);
  if (!source) return;

  if (activePanel === 'hunt') {
    for (const selector of ['.auto-hunt-controls', '.hunt-status', '.action-list', '.monster-list']) {
      const section = source.querySelector(selector);
      if (section) content.append(section.cloneNode(true));
    }
  } else {
    content.append(source.cloneNode(true));
  }
  content.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => forwardAction(button));
  });
}

function openPanel(name) {
  if (activePanel === name) {
    closePanel();
    return;
  }
  const skillButton = frame.querySelector('.skill-tree-trigger');
  if (skillButton?.getAttribute('aria-expanded') === 'true') skillButton.click();
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
  const fields = ['itemId', 'slot', 'buyId', 'monsterId', 'attribute'];
  const original = [...app.querySelectorAll('[data-action]')].find((candidate) =>
    candidate.dataset.action === button.dataset.action && fields.every((field) => candidate.dataset[field] === button.dataset[field])
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

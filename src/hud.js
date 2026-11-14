const app = document.querySelector('#app');
const frame = document.querySelector('#world-demo .world-frame');
if (!app || !frame) throw new Error('Não foi possível iniciar a barra de interface.');

const icons = {
  status: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.5-3.5 2.8-5.3 6.5-5.3s6 1.8 6.5 5.3M19 5v6m-3-3h6"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 5.5 20h13L20 8.5M3 5h18v4H3zM10 12h4"/></svg>',
  points: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M5.5 5.5l13 13m0-13-13 13"/><circle cx="12" cy="12" r="8.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

const toolbar = document.createElement('nav');
toolbar.className = 'game-toolbar';
toolbar.setAttribute('aria-label', 'Painéis do jogo');
toolbar.innerHTML = `
  <button type="button" class="toolbar-button" data-panel="status" aria-label="Abrir status do personagem" aria-controls="game-hud-panel" aria-expanded="false" title="Status">
    ${icons.status}<span>Status</span>
  </button>
  <button type="button" class="toolbar-button" data-panel="inventory" aria-label="Abrir inventário" aria-controls="game-hud-panel" aria-expanded="false" title="Inventário">
    ${icons.inventory}<span>Inventário</span>
  </button>
  <button type="button" class="toolbar-button" data-panel="points" aria-label="Abrir pontos de atributos" aria-controls="game-hud-panel" aria-expanded="false" title="Atributos">
    ${icons.points}<span>Atributos</span>
  </button>`;

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
  if (name === 'inventory') return app.querySelector('.main-grid > aside');
  return null;
}

function refreshPanel() {
  refreshQueued = false;
  if (!activePanel) return;

  const content = panel.querySelector('.game-hud-panel-content');
  const heading = panel.querySelector('h2');
  const source = findSourcePanel(activePanel);
  heading.textContent = activePanel === 'status' ? 'Status do personagem' : activePanel === 'inventory' ? 'Inventário e equipamentos' : 'Pontos de atributos';
  content.replaceChildren();

  if (activePanel === 'points') {
    const sourceHero = app.querySelector('.hero-meta');
    if (!sourceHero) return;
    const summary = document.createElement('p');
    summary.className = 'points-intro';
    summary.textContent = `${sourceHero.querySelector('h3')?.textContent || 'Herói'} · distribua os pontos disponíveis nos atributos.`;
    content.append(summary);

    const stats = sourceHero.querySelector('.hero-stats')?.cloneNode(true);
    if (stats) content.append(stats);

    const sourceButtons = [...app.querySelectorAll('[data-action="boost"]')];
    const pointActions = document.createElement('div');
    pointActions.className = 'attribute-actions';
    for (const button of sourceButtons) {
      const clone = button.cloneNode(true);
      clone.setAttribute('aria-label', `Adicionar um ponto em ${button.dataset.attribute}`);
      pointActions.append(clone);
    }
    content.append(pointActions);
    if (!sourceButtons.length) {
      const note = document.createElement('p');
      note.className = 'points-intro';
      note.textContent = 'Você ainda não tem pontos disponíveis. Ganhe experiência para subir de nível.';
      content.append(note);
    }
    return;
  }

  if (!source) return;
  const clone = source.cloneNode(true);
  clone.classList.add('hud-source-clone');
  content.append(clone);
}

function openPanel(name) {
  if (activePanel === name) {
    closePanel();
    return;
  }
  activePanel = name;
  panel.hidden = false;
  toolbar.querySelectorAll('.toolbar-button').forEach((button) => {
    const selected = button.dataset.panel === name;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-expanded', String(selected));
  });
  refreshPanel();
}

function closePanel() {
  activePanel = null;
  panel.hidden = true;
  toolbar.querySelectorAll('.toolbar-button').forEach((button) => {
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

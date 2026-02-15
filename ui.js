import { gameTick, addRandomDeveloper } from './state.js';

const STAT_KEYS = [
  { key: 'cash', label: 'Cash' },
  { key: 'userCount', label: 'User count' },
  { key: 'salesSpend', label: 'Sales spend' },
  { key: 'productMaturity', label: 'Product maturity' },
];

const TECH_DEBT_MIN = 0.1;
const TECH_DEBT_MAX = 0.5;

function formatValue(value) {
  if (typeof value === 'number' && (value < 0 || value > 1 || (value !== 0 && value < 1 && value > 0))) {
    return value.toFixed(3);
  }
  return String(value);
}

function renderStats(state) {
  const container = document.getElementById('dev-stats');
  if (!container) return;
  container.innerHTML = STAT_KEYS.map(
    ({ key, label }) => `<div class="dev-stat"><span class="dev-stat-label">${label}:</span> <span class="dev-stat-value" data-key="${key}">${formatValue(state[key])}</span></div>`
  ).join('');
}

function renderEmployees(state) {
  const container = document.getElementById('dev-employees-list');
  if (!container) return;
  container.innerHTML = state.employees
    .map(
      (emp, i) =>
        `<li class="dev-employee-row" data-index="${i}">
          <span class="dev-employee-name">${emp.name}</span>
          <span class="dev-employee-motivation">${emp.motivation.toFixed(2)}</span>
          <button type="button" class="dev-employee-remove" aria-label="Remove">×</button>
        </li>`
    )
    .join('');
  container.querySelectorAll('.dev-employee-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.closest('.dev-employee-row').dataset.index, 10);
      state.employees.splice(index, 1);
      renderEmployees(state);
      renderStats(state);
    });
  });
}

function bindNumberControl(state, inputId, minusId, plusId, key, min, max, step = 1) {
  const input = document.getElementById(inputId);
  const minusBtn = document.getElementById(minusId);
  const plusBtn = document.getElementById(plusId);
  if (!input || !minusBtn || !plusBtn) return;

  function syncToState() {
    let v = Number(input.value);
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    state[key] = v;
    input.value = state[key];
    renderStats(state);
  }

  function syncToInput() {
    input.value = state[key];
  }

  input.addEventListener('change', syncToState);
  minusBtn.addEventListener('click', () => {
    state[key] = Math.max(min, (state[key] ?? min) - step);
    syncToInput();
    renderStats(state);
  });
  plusBtn.addEventListener('click', () => {
    state[key] = Math.min(max, (state[key] ?? min) + step);
    syncToInput();
    renderStats(state);
  });
  syncToInput();
}

function refreshAll(state) {
  renderStats(state);
  renderEmployees(state);
  const salesInput = document.getElementById('dev-sales-spend-input');
  const techInput = document.getElementById('dev-tech-debt-input');
  if (salesInput) salesInput.value = state.salesSpend;
  if (techInput) techInput.value = state.technicalDebtTarget;
}

export function initDevUI(state) {
  const root = document.getElementById('dev-ui');
  if (!root) return;

  root.innerHTML = `
    <div class="dev-ui-panel">
      <h2 class="dev-ui-title">Dev stats</h2>
      <div id="dev-stats" class="dev-stats"></div>
      <button type="button" id="dev-tick-btn" class="dev-tick-btn">Tick</button>

      <div class="dev-control-group">
        <label class="dev-control-label">Sales spend</label>
        <div class="dev-number-row">
          <button type="button" id="dev-sales-spend-minus" class="dev-num-btn">−</button>
          <input type="number" id="dev-sales-spend-input" class="dev-num-input" min="0" step="100" />
          <button type="button" id="dev-sales-spend-plus" class="dev-num-btn">+</button>
        </div>
      </div>
      <div class="dev-control-group">
        <label class="dev-control-label">Tech debt target</label>
        <div class="dev-number-row">
          <button type="button" id="dev-tech-debt-minus" class="dev-num-btn">−</button>
          <input type="number" id="dev-tech-debt-input" class="dev-num-input" min="0.1" max="0.9" step="0.1" />
          <button type="button" id="dev-tech-debt-plus" class="dev-num-btn">+</button>
        </div>
      </div>

      <div class="dev-control-group">
        <button type="button" id="dev-add-developer-btn" class="dev-add-dev-btn">Add developer</button>
      </div>
      <div class="dev-control-group">
        <label class="dev-control-label">Developers</label>
        <ul id="dev-employees-list" class="dev-employees-list"></ul>
      </div>
    </div>
  `;

  document.getElementById('dev-tick-btn').addEventListener('click', () => {
    gameTick(state);
    refreshAll(state);
  });

  document.getElementById('dev-add-developer-btn').addEventListener('click', () => {
    addRandomDeveloper(state);
    renderEmployees(state);
    renderStats(state);
  });

  bindNumberControl(state, 'dev-sales-spend-input', 'dev-sales-spend-minus', 'dev-sales-spend-plus', 'salesSpend', 0, null, 100);
  bindNumberControl(state, 'dev-tech-debt-input', 'dev-tech-debt-minus', 'dev-tech-debt-plus', 'technicalDebtTarget', TECH_DEBT_MIN, TECH_DEBT_MAX, 0.1);

  refreshAll(state);
}

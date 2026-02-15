import { gameTick, addRandomDeveloper, calculateOutput, getUserCount, getMRR } from './state.js';

const TECH_DEBT_MIN = 0.1;
const TECH_DEBT_MAX = 0.5;
const PRODUCT_PRICE_MIN = 10;
const PRODUCT_PRICE_MAX = 500;
const PRODUCT_PRICE_STEP = 10;
const SALES_SPEND_STEP = 100;
const VELOCITY_MAX = 6;
const HISTORY_MAX_ENTRIES = 20;

let historyEntries = [];

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function valueToBars(normalized, invertColor = false) {
  const clamped = Math.max(0, Math.min(1, normalized));
  let trueBars = Math.min(5, Math.max(1, Math.floor(clamped / 0.2) + 1));
  const noise = Math.floor(Math.random() * 3) - 1;
  const displayedBars = Math.min(5, Math.max(1, trueBars + noise));
  return { bars: displayedBars, invertColor };
}

function renderGaugeHTML(bars, invertColor) {
  const parts = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= bars;
    let cls = 'dev-gauge-bar';
    if (filled) {
      cls += ' filled';
      if (invertColor) {
        cls += i <= 2 ? ' inverted-good' : i >= 4 ? ' inverted-bad' : i === 3 ? ' neutral' : '';
      } else {
        cls += i <= 2 ? ' bad' : i === 3 ? ' neutral' : '';
      }
    }
    parts.push(`<span class="${cls}"></span>`);
  }
  return parts.join('');
}

function renderHeader(state) {
  const container = document.getElementById('dev-header');
  if (!container) return;
  const mrr = getMRR(state);
  const launched = state.productMaturity >= state.launchMaturity;
  container.innerHTML = `
    <div class="dev-header-stat"><span class="dev-header-label">Month</span><span class="dev-header-value">${state.monthNumber}</span></div>
    <div class="dev-header-stat"><span class="dev-header-label">Cash</span><span class="dev-header-value">${formatCurrency(state.cash)}</span></div>
    <div class="dev-header-stat"><span class="dev-header-label">Users</span><span class="dev-header-value">${getUserCount(state)}</span></div>
    <div class="dev-header-stat"><span class="dev-header-label">MRR</span><span class="dev-header-value">${formatCurrency(mrr)}</span></div>
    <span class="dev-launch-badge ${launched ? '' : 'pre-launch'}">${launched ? 'Launched' : 'Pre-launch'}</span>
  `;
}

function renderGauges(state) {
  const container = document.getElementById('dev-gauges');
  if (!container) return;

  const productMaturity = valueToBars(state.productMaturity);
  const techDebtScaled = state.technicalDebt / 0.5;
  const techDebt = valueToBars(techDebtScaled, true);

  const avgMotivation = state.employees.length
    ? state.employees.reduce((s, e) => s + e.motivation, 0) / state.employees.length
    : 0;
  const moraleNorm = (avgMotivation - 0.2) / 1.3;
  const teamMorale = valueToBars(moraleNorm);

  const rawVelocity = calculateOutput(state);
  const velocityNorm = Math.min(1, rawVelocity / VELOCITY_MAX);
  const teamVelocity = valueToBars(velocityNorm);

  const productReputation = valueToBars(state.reputation);

  container.innerHTML = `
    <div class="dev-gauge-row"><span class="dev-gauge-label">Product</span><span class="dev-gauge-bars">${renderGaugeHTML(productMaturity.bars, productMaturity.invertColor)}</span></div>
    <div class="dev-gauge-row"><span class="dev-gauge-label">Tech Debt</span><span class="dev-gauge-bars">${renderGaugeHTML(techDebt.bars, techDebt.invertColor)}</span></div>
    <div class="dev-gauge-row"><span class="dev-gauge-label">Morale</span><span class="dev-gauge-bars">${renderGaugeHTML(teamMorale.bars, teamMorale.invertColor)}</span></div>
    <div class="dev-gauge-row"><span class="dev-gauge-label">Velocity</span><span class="dev-gauge-bars">${renderGaugeHTML(teamVelocity.bars, teamVelocity.invertColor)}</span></div>
    <div class="dev-gauge-row"><span class="dev-gauge-label">Reputation</span><span class="dev-gauge-bars">${renderGaugeHTML(productReputation.bars, productReputation.invertColor)}</span></div>
  `;
}

function renderSkillGauge(baseProductivity) {
  const norm = (baseProductivity - 0.5) / 1.0;
  const { bars } = valueToBars(norm);
  const parts = [];
  for (let i = 1; i <= 5; i++) {
    parts.push(`<span class="dev-employee-skill-bar ${i <= bars ? 'filled' : ''}"></span>`);
  }
  return parts.join('');
}

function renderEmployees(state, onRefresh) {
  const container = document.getElementById('dev-employees-list');
  if (!container) return;
  container.innerHTML = state.employees
    .map(
      (emp, i) =>
        `<li class="dev-employee-row" data-index="${i}">
          <span class="dev-employee-label">Dev #${i + 1}</span>
          <span class="dev-employee-skill">${renderSkillGauge(emp.baseProductivity)}</span>
          <span class="dev-employee-salary">${formatCurrency(emp.salary)}/mo</span>
          <button type="button" class="dev-employee-remove" aria-label="Fire">×</button>
        </li>`
    )
    .join('');
  container.querySelectorAll('.dev-employee-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.closest('.dev-employee-row').dataset.index, 10);
      state.employees.splice(index, 1);
      onRefresh();
    });
  });
}

function bindNumberControl(state, inputId, minusId, plusId, key, min, max, step, onRefresh) {
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
    onRefresh();
  }

  function syncToInput() {
    input.value = state[key];
  }

  input.addEventListener('change', syncToState);
  minusBtn.addEventListener('click', () => {
    state[key] = Math.max(min, (state[key] ?? min) - step);
    syncToInput();
    onRefresh();
  });
  plusBtn.addEventListener('click', () => {
    const effectiveMax = max ?? Infinity;
    state[key] = Math.min(effectiveMax, (state[key] ?? min) + step);
    syncToInput();
    onRefresh();
  });
  syncToInput();
}

function pushHistoryEntry(month, deltaCash, deltaUsers) {
  const cashStr = deltaCash >= 0 ? `+${formatCurrency(deltaCash)}` : formatCurrency(deltaCash);
  const userStr = deltaUsers >= 0 ? `+${deltaUsers}` : String(deltaUsers);
  historyEntries.push(`Month ${month}: ${userStr} users, ${cashStr} cash flow`);
  if (historyEntries.length > HISTORY_MAX_ENTRIES) {
    historyEntries.shift();
  }
}

function renderHistory() {
  const container = document.getElementById('dev-history');
  if (!container) return;
  container.innerHTML = historyEntries.length
    ? historyEntries.map((e) => `<div class="dev-history-entry">${e}</div>`).join('')
    : '<div class="dev-history-entry">No events yet. Click Next Month to advance.</div>';
}

function refreshAll(state) {
  renderHeader(state);
  renderGauges(state);
  renderEmployees(state, () => refreshAll(state));
  renderHistory();
  const salesInput = document.getElementById('dev-sales-spend-input');
  const techInput = document.getElementById('dev-tech-debt-input');
  const priceInput = document.getElementById('dev-product-price-input');
  if (salesInput) salesInput.value = state.salesSpend;
  if (techInput) techInput.value = state.technicalDebtTarget;
  if (priceInput) priceInput.value = state.productPrice;
  const nextBtn = document.getElementById('dev-next-month-btn');
  if (nextBtn) nextBtn.disabled = !!state.bankrupt;
  const overlay = document.getElementById('dev-bankruptcy-overlay');
  if (overlay) overlay.style.display = state.bankrupt ? 'flex' : 'none';
}

export function initDevUI(state) {
  const root = document.getElementById('dev-ui');
  if (!root) return;

  root.innerHTML = `
    <header id="dev-header" class="dev-header-bar"></header>
    <div class="dev-main-grid">
      <div class="dev-left-panel">
        <div class="dev-gauges-section">
          <h3 style="margin:0 0 0.5rem;font-size:0.9rem">Gauges</h3>
          <div id="dev-gauges" class="dev-gauges-section"></div>
        </div>
        <div class="dev-control-group">
          <label class="dev-control-label">Sales spend</label>
          <div class="dev-number-row">
            <button type="button" id="dev-sales-spend-minus" class="dev-num-btn">−</button>
            <input type="number" id="dev-sales-spend-input" class="dev-num-input" min="0" step="${SALES_SPEND_STEP}" />
            <button type="button" id="dev-sales-spend-plus" class="dev-num-btn">+</button>
          </div>
        </div>
        <div class="dev-control-group">
          <label class="dev-control-label">Product price</label>
          <div class="dev-number-row">
            <button type="button" id="dev-product-price-minus" class="dev-num-btn">−</button>
            <input type="number" id="dev-product-price-input" class="dev-num-input" min="${PRODUCT_PRICE_MIN}" max="${PRODUCT_PRICE_MAX}" step="${PRODUCT_PRICE_STEP}" />
            <button type="button" id="dev-product-price-plus" class="dev-num-btn">+</button>
          </div>
        </div>
        <div class="dev-control-group">
          <label class="dev-control-label">Tech debt target</label>
          <div class="dev-number-row">
            <button type="button" id="dev-tech-debt-minus" class="dev-num-btn">−</button>
            <input type="number" id="dev-tech-debt-input" class="dev-num-input" min="${TECH_DEBT_MIN}" max="${TECH_DEBT_MAX}" step="0.1" />
            <button type="button" id="dev-tech-debt-plus" class="dev-num-btn">+</button>
          </div>
        </div>
      </div>
      <div id="dev-card-area" class="dev-card-area">Event cards will appear here</div>
      <div class="dev-team-panel">
        <h3>Team</h3>
        <button type="button" id="dev-add-developer-btn" class="dev-add-dev-btn">Hire developer</button>
        <ul id="dev-employees-list" class="dev-employees-list"></ul>
      </div>
    </div>
    <div id="dev-history" class="dev-history-log"></div>
    <button type="button" id="dev-next-month-btn" class="dev-next-month-btn">Next Month</button>
    <div id="dev-bankruptcy-overlay" class="dev-bankruptcy-overlay" style="display:none">
      <div class="dev-bankruptcy-box">
        <h2>Game Over</h2>
        <p>You ran out of runway. The servers are shut down and the team goes home.</p>
      </div>
    </div>
  `;

  document.getElementById('dev-next-month-btn').addEventListener('click', () => {
    const cashBefore = state.cash;
    const usersBefore = getUserCount(state);
    gameTick(state);
    pushHistoryEntry(state.monthNumber, state.cash - cashBefore, getUserCount(state) - usersBefore);
    refreshAll(state);
  });

  document.getElementById('dev-add-developer-btn').addEventListener('click', () => {
    addRandomDeveloper(state);
    refreshAll(state);
  });

  const onRefresh = () => refreshAll(state);
  bindNumberControl(state, 'dev-sales-spend-input', 'dev-sales-spend-minus', 'dev-sales-spend-plus', 'salesSpend', 0, null, SALES_SPEND_STEP, onRefresh);
  bindNumberControl(state, 'dev-product-price-input', 'dev-product-price-minus', 'dev-product-price-plus', 'productPrice', PRODUCT_PRICE_MIN, PRODUCT_PRICE_MAX, PRODUCT_PRICE_STEP, onRefresh);
  bindNumberControl(state, 'dev-tech-debt-input', 'dev-tech-debt-minus', 'dev-tech-debt-plus', 'technicalDebtTarget', TECH_DEBT_MIN, TECH_DEBT_MAX, 0.1, onRefresh);

  refreshAll(state);
}

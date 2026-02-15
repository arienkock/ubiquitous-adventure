# Architecture

## Principles

- **Zero dependencies.** No build step, no bundler, no package manager, no runtime libraries. The application runs directly in the browser from source files.
- **Plain web APIs only.** ES modules, DOM API, and standard JavaScript — nothing else.
- **Tests run in the browser.** No testing framework. A minimal custom harness (`test-utils.js`) provides `expect()` assertions and renders results to the page.

## File Overview

```
index.html      App entry point — loads index.js as an ES module
index.js        Bootstrap — creates initial state, initializes UI
state.js        Game state factory and all simulation logic (pure functions)
ui.js           DOM rendering and event binding (side-effectful)
test.html       Test entry point — loads test.js as an ES module
test.js         Test definitions (plain functions)
test-utils.js   Test harness: expect(), runTests(), result rendering
GAME_DESIGN.md  Game design document
```

## Layers

```
 ┌────────────────────────────┐
 │  index.html / test.html    │  Entry points (no logic)
 └────────────┬───────────────┘
              │ <script type="module">
 ┌────────────▼───────────────┐
 │  index.js  /  test.js      │  Bootstrap / test registration
 └─────┬──────────┬───────────┘
       │          │
 ┌─────▼────┐ ┌──▼───────────┐
 │  ui.js   │ │ test-utils.js│  UI rendering / test harness
 └─────┬────┘ └──┬───────────┘
       │         │
 ┌─────▼─────────▼────────────┐
 │        state.js             │  State & simulation (pure)
 └─────────────────────────────┘
```

### state.js — State & Simulation

Pure logic with no DOM access. Exports:

- `createInitialState()` — returns a plain object representing a new game.
- `gameTick(state)` — advances the simulation by one month in 5 phases: Card (stub), Development, Market, Finance, Drift. Sets `state.bankrupt = true` on bankruptcy.
- `addRandomDeveloper(state)` — adds a randomized employee.
- `calculateOutput(state)` — raw team output before feature/cleanup split.
- `calculateDevelopmentAllocation(state, rawOutput)` — splits output into `{ featureOutput, cleanUpOutput }` based on tech debt vs target.
- `applyTechnicalDebt(state, featureOutput, cleanUpOutput)` — grows/reduces tech debt from development.
- `calculateChurnRate(state)` / `calculateChurn(state)` — user churn from debt, price, and reputation.
- `calculateOrganicUsers(state)` — word-of-mouth user acquisition post-launch.
- `applyReputationDrift(state, churnRate, organicUsers)` — adjusts reputation based on product quality signals.
- `applyMotivationDrift(state)` — background motivation changes (debt frustration, team size, tenure).
- `calculateEmployeeProductivity(state, employee)` — effective productivity with onboarding ramp-up.

State is a single mutable object passed by reference. There is no immutability layer or store abstraction.

### ui.js — UI

Imperative DOM rendering. Receives the state object and reads/writes it directly. Responsible for:

- Building the layout: header bar (month, cash, users, MRR, launch status), gauges panel (5-bar fuzzy gauges with ±1 noise), controls (sales spend, product price, tech debt target), team panel (employees with skill gauges, salary, fire), card area placeholder, history log, Next Month button.
- Rendering gauges for Product Maturity, Tech Debt, Team Morale, Team Velocity, Product Reputation using the design-doc mapping (0–1 to 1–5 bars with noise).
- Binding controls to state mutations.
- Calling `gameTick()` on the Next Month button; tracking per-month history (delta cash, delta users).
- Showing a bankruptcy overlay and disabling Next Month when `state.bankrupt` is true.

### test-utils.js — Test Harness

A self-contained, in-browser test runner. Provides:

- `expect(value)` — returns an assertion object with matchers (`toBe`, `toBeGreaterThan`, `toBeLessThan`, etc.). Failures throw `Error`.
- `runTests(...fns)` — runs each test function with a fresh state, catches errors, and renders pass/fail results into the DOM.
- URL-based test filtering via `?tests=testName1,testName2`.

### test.js — Tests

Each test is a plain function that receives a fresh `state` object. Tests call state functions, run assertions, and throw on failure. No mocking, no async — everything is synchronous and deterministic.

## How to Run

**App:** serve the project root with any static HTTP server and open `index.html`.

**Tests:** open `test.html` in the browser. Results render on the page. Filter with `?tests=fnName`.

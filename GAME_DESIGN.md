# Dev Cards — Game Design Document

## 1. Overview

**Dev Cards** is a turn-based simulation of running a SaaS startup. Each turn represents one month. The player makes strategic decisions about hiring, spending, pricing, and development priorities while responding to event cards that create narrative moments and force tough tradeoffs.

The core tension: **grow fast enough to win, but not so recklessly that you go bankrupt or let quality collapse.**

---

## 2. Core Fantasy & Theme

You are a technical founder who just received seed funding. You have a product idea, one developer (yourself), and $500,000 in the bank. You need to build the product, launch it, acquire users, and grow into a successful SaaS business.

The game captures the essential anxieties of startup life:
- You never have perfect information about your own company
- Every decision involves tradeoffs
- Growth creates its own problems
- Things rarely go according to plan

---

## 3. Information Display

A key design principle: **the player operates under uncertainty**, just like a real founder.

### Exact Values (shown as numbers)
| Value | Description |
|-------|-------------|
| **Cash** | Bank balance in dollars |
| **User Count** | Number of paying subscribers |
| **Sales Spend** | Monthly marketing/sales budget (set by player) |
| **Product Price** | Monthly price per user (set by player) |
| **Month** | Current month number |
| **Employee Count** | Number of team members |
| **Employee Salaries** | Each employee's monthly salary |

### Abstract Values (shown as 5-segment gauges)
These are displayed as a gauge with 5 bars (like a signal strength meter). The displayed value has a **±1 bar margin of error** from the true underlying value. The player can never be certain whether "3 bars" means the real value is 2, 3, or 4.

| Gauge | What it represents | Underlying driver |
|-------|--------------------|-------------------|
| **Product Maturity** | How feature-complete the product is | `productMaturity` (0 to 1) |
| **Tech Debt** | How messy and fragile the codebase is | `technicalDebt` (0.0 to 0.5) |
| **Team Morale** | How motivated and happy the team is | Average `motivation` across employees |
| **Team Velocity** | How fast the team is shipping | `calculateOutput()` result |
| **Product Reputation** | How users perceive the product | Derived from maturity, debt, churn history |

### Why Gauges?
- Prevents the player from min-maxing with spreadsheet precision
- Creates realistic uncertainty — a real CEO can't see their team's exact morale score
- Makes gut-feel decisions more important than pure optimization
- Adds tension: "Is my tech debt *actually* getting worse, or is the gauge just noisy?"

### Gauge Mapping
The underlying float value maps to bars as follows (example for a 0-to-1 value):

| True Value | True Bars | Displayed (with noise) |
|------------|-----------|----------------------|
| 0.00–0.20 | 1 (Critical) | 1 or 2 |
| 0.20–0.40 | 2 (Poor) | 1, 2, or 3 |
| 0.40–0.60 | 3 (Average) | 2, 3, or 4 |
| 0.60–0.80 | 4 (Good) | 3, 4, or 5 |
| 0.80–1.00 | 5 (Excellent) | 4 or 5 |

The noise is re-rolled each time the display updates, so it may flicker between adjacent values — reinforcing uncertainty.

---

## 4. Game State

### State Fields

```
monthNumber          — Current month (0-indexed, advances each tick)
cash                 — Player's bank balance ($)
userCohorts[]        — Array of { count, signupPrice }; each cohort pays its signup price (yearly subscription model)
salesSpend           — Monthly sales/marketing budget (player-controlled)
productPrice         — Monthly price for *new* users only (player-controlled, default $100)
customerAcquisitionCost — Base cost to acquire one user (base $10, modified by events/market)
launchMaturity       — Product maturity threshold to launch (fixed at 0.0135)
productMaturity      — How complete the product is (0 to ~1, uncapped but diminishing)
marketReadyMonth     — First month when paid acquisition works (null until launch, then launchMonth + random 2–5)
technicalDebt        — Codebase messiness (0.0 to 0.5)
technicalDebtTarget  — Player's desired tech debt level; team auto-allocates cleanup effort
cleanUpEffort        — Fraction of dev effort going to debt reduction (derived)
employees[]          — Array of team members
  .salary            — Monthly salary ($)
  .baseProductivity  — Innate skill level (0.5 to 1.5)
  .motivation        — Current motivation multiplier (0.0 to 1.5)
  .monthsEmployed    — Tenure (affects onboarding, loyalty)
reputation           — Hidden product reputation score (affects churn & organic growth)
```

---

## 5. Turn Structure

Each turn represents **one month**. The player can adjust their ongoing decisions at any time, then advances the simulation by clicking **"Next Month"**.

### Phase Order (resolved on tick)

1. **Card Phase** — Draw an event card (if applicable). The player reads it and makes a choice. The card's effects are applied.

2. **Development Phase** — The team works.
   - Product maturity increases based on team output.
   - Output is reduced by communication overhead (Brooks's Law) and tech debt.
   - If `technicalDebt` is above `technicalDebtTarget`, some output is diverted to cleanup, reducing tech debt but slowing feature work.
   - If `technicalDebt` is below the target, debt gradually increases from normal development.

3. **Market Phase** — Users come and go.
   - **Market warm-up:** After launch, a random 2–5 month delay before paid acquisition starts (sales spend is charged but no users yet).
   - New users acquired: `floor(salesSpend / effectiveCAC)` — only if product launched and market ready. `effectiveCAC = customerAcquisitionCost × (productPrice / 100)` (higher price = harder to acquire).
   - Organic users: a small bonus based on reputation and existing user count (word of mouth).
   - Churn: users leave based on churn rate (see Section 7.5). Price does *not* affect churn — existing users keep their signup price.

4. **Finance Phase** — Money moves.
   - Income: sum of `cohort.count × cohort.signupPrice` for all cohorts (yearly subscription: each user pays the price they signed up at)
   - Expenses: total payroll + salesSpend (salesSpend only charged post-launch)
   - Cash is updated. If cash ≤ 0, the game ends in bankruptcy.

5. **Drift Phase** — Background changes.
   - Employee motivation drifts based on conditions (team size changes, overwork, events).
   - Tech debt drifts slightly upward from normal development activity.
   - Reputation adjusts based on product quality, uptime, and churn trends.
   - `monthsEmployed` increments for each employee.

---

## 6. Player Actions

The player can perform these actions between ticks (or in response to cards):

### 6.1 Set Sales Spend
- Adjustable in increments of $100
- Only takes effect after the product has launched
- Higher spend = more users, but costs cash

### 6.2 Set Product Price
- Adjustable in increments of $10 (min $10, max $500)
- Affects **new users only**. Existing users pay the price they signed up at (yearly subscription model).
- Higher price = more revenue per new user but:
  - Reduces new user acquisition (effective CAC scales with price)
  - Does not increase churn (existing users are locked in)

### 6.3 Set Tech Debt Target
- A gauge from Low (0.1) to High (0.5) in 0.1 increments
- Low target → team spends more effort on cleanup → slower feature development
- High target → team focuses on features → faster maturity growth but debt accumulates
- This is the player's primary lever for the build-fast-vs-build-right tradeoff

### 6.4 Hire a Developer
- Adds a new employee with randomized stats:
  - `baseProductivity`: random 0.5–1.5
  - `salary`: $3,000–$10,500 (correlated with productivity)
  - `motivation`: starts at 1.0
  - `monthsEmployed`: starts at 0
- New hires have a **3-month onboarding period** during which their effective productivity ramps up (33% → 66% → 100%)
- Adding team members increases communication overhead (Brooks's Law)
- The player sees the employee's salary but their productivity/skill is shown as a fuzzy gauge

### 6.5 Fire a Developer
- Removes an employee immediately
- Saves their salary going forward
- Temporarily reduces team morale (remaining employees worry about job security)
- Lost productivity is immediate

### 6.6 Respond to Event Card
- See Section 8

---

## 7. Core Systems

### 7.1 Revenue & Costs

**Monthly Income:**
```
income = Σ (cohort.count × cohort.signupPrice)
```
Each user cohort pays the price they signed up at. New users join at the current `productPrice`.

**Monthly Expenses:**
```
expenses = totalPayroll + (salesSpend if launched, else 0)
totalPayroll = sum of all employee salaries
```

**Cash Flow:**
```
cash += income - expenses
```

The game ends if cash drops to 0 or below.

### 7.2 Product Development

**Team Output:**
```
collectiveProductivity = Σ effectiveProductivity(employee)
communicationLines = n × (n - 1) / 2      // Brooks's Law
techDebtPenalty = 1 - technicalDebt
commPenalty = 1 - communicationLines × 0.01
rawOutput = collectiveProductivity × techDebtPenalty × commPenalty
```

**Effective Employee Productivity:**
```
effectiveProductivity = baseProductivity × motivation × onboardingMultiplier
onboardingMultiplier:
  month 0: 0.33
  month 1: 0.66
  month 2+: 1.00
```

**Development Allocation:**
The team's output is split between feature development and tech debt cleanup:

```
if technicalDebt > technicalDebtTarget:
    cleanUpFraction = min(0.5, (technicalDebt - technicalDebtTarget) × 2)
else:
    cleanUpFraction = 0

featureOutput = rawOutput × (1 - cleanUpFraction) / MAGIC_PRODUCTIVITY_DIVIDER
cleanUpOutput = rawOutput × cleanUpFraction
```

Feature output increases `productMaturity`. Cleanup output decreases `technicalDebt`.

**Product Maturity** approaches but never quite reaches 1.0. The rate of improvement has diminishing returns — the first features are easy, the last 10% is grueling.

### 7.3 Technical Debt

Tech debt is the silent killer of SaaS companies.

**Natural Growth:** Every month that features are developed, tech debt creeps upward:
```
debtGrowth = featureOutput × 0.05    // 5% of feature work creates debt
```

**Cleanup:** When the team allocates effort to cleanup:
```
debtReduction = cleanUpOutput × 0.1
technicalDebt = max(0, technicalDebt - debtReduction + debtGrowth)
```

**Effects of High Tech Debt:**
- Reduces development output (already in the formula)
- Increases probability of "outage" and "bug" event cards
- Increases user churn (buggy product)
- Reduces team morale over time (developers hate working in messy code)

### 7.4 Team Management

**Motivation** is the hidden heart of the game. Happy developers are productive developers.

Motivation drifts each month based on:

| Factor | Effect on Motivation |
|--------|---------------------|
| High tech debt (> 0.3) | -0.02/month (frustration with bad code) |
| Recent firing | -0.05 for one month (fear/uncertainty) |
| Recent hiring (growing team) | +0.01 (excitement) |
| Team too large (> 10) | -0.01/month (bureaucracy fatigue) |
| Long tenure (> 12 months) with no raise | -0.01/month (stagnation) |
| Positive event card outcomes | +0.02 to +0.05 (temporary boost) |
| Negative event card outcomes | -0.02 to -0.05 (temporary hit) |

Motivation is clamped to [0.2, 1.5]. It can never reach zero (even miserable employees do *something*) and 1.5 represents a truly inspired team.

**Communication Overhead (Brooks's Law):**
```
overhead = communicationLines × 0.01
communicationLines = n × (n - 1) / 2
```
For reference:
- 1 dev: 0 lines → 0% overhead
- 3 devs: 3 lines → 3% overhead
- 5 devs: 10 lines → 10% overhead
- 8 devs: 28 lines → 28% overhead
- 10 devs: 45 lines → 45% overhead

This naturally caps effective team size. Beyond ~10 developers, adding more people actively slows the team down.

### 7.5 User Acquisition & Churn

**Market Warm-up:** After launch, paid acquisition is delayed by a random 2–5 months. Sales spend is charged but no users are acquired until the market is ready.

**Paid Acquisition:**
```
effectiveCAC = customerAcquisitionCost × (productPrice / 100)
newPaidUsers = floor(salesSpend / effectiveCAC)
```
Only active after product launch (productMaturity ≥ launchMaturity) and when `monthNumber ≥ marketReadyMonth`. Higher price makes acquisition harder.

**Organic Acquisition (Word of Mouth):**
```
organicUsers = floor(userCount × organicRate)
organicRate = 0.01 × reputationMultiplier    // 1% base, modified by reputation
```
A good product brings in users for free. A bad one doesn't.

**Churn:**
```
churnRate = baseChurn + debtChurn - reputationBonus
baseChurn = 0.03                                    // 3% base monthly churn
debtChurn = technicalDebt × 0.06                    // up to 3% extra from bugs
reputationBonus = reputation × 0.02                  // good rep reduces churn

churnedUsers = floor(userCount × churnRate)
```
Price does not affect churn — existing users pay their locked-in signup price.

The player never sees the exact churn rate. They only observe user count going up or down and must infer what's happening.

### 7.6 Reputation

Reputation is a hidden value (0.0 to 1.0) that represents the market's perception of the product. It is displayed as a fuzzy gauge.

```
reputationDrift:
  if productMaturity > 0.5: +0.01/month (mature product impresses)
  if technicalDebt > 0.3:   -0.02/month (bugs damage reputation)
  if churnRate > 0.08:      -0.01/month (word gets around)
  if organicUsers > 0:      +0.005/month (positive buzz)
```

Reputation takes a long time to build and can be destroyed quickly by a bad product or outage.

---

## 8. The Card System

Cards are the narrative engine of the game. They create the stories, surprises, and agonizing decisions that make each playthrough unique.

### 8.1 Card Structure

Each card has:
- **Title** — A short, evocative name
- **Flavor Text** — A sentence or two of narrative context
- **Choices** — 1 to 3 options the player can pick (some cards have no choice — they just happen)
- **Effects** — Mechanical changes applied to the game state
- **Conditions** — Prerequisites for the card to appear in the deck (e.g., "only after month 6", "only if tech debt > 0.3")

### 8.2 Draw Rules

- **1 card is drawn per turn** (most months)
- Some months may have **no card** (roughly 20% chance of a quiet month)
- Certain milestone events are **guaranteed** (see Section 9)
- The deck is filtered by conditions each turn — only eligible cards can be drawn
- Cards are drawn without replacement within an "era" (early/mid/late game), then reshuffled
- Some cards are one-time-only (marked as unique)

### 8.3 Card Categories

#### Crisis Cards
Bad things happen. The player mitigates damage by choosing the least-bad option.

**"Server Outage"**
*Conditions: techDebt > 0.2, product launched*
> Your application went down for 8 hours. Users are furious and #YourAppIsDown is trending.
- **A) All hands on deck** — Team fixes it fast. -1 month of feature progress, morale -0.03.
- **B) Blame the cloud provider** — Takes longer to fix. Churn +5% this month. Reputation -0.05.

**"Security Breach"**
*Conditions: techDebt > 0.35, userCount > 100*
> A security researcher found a critical vulnerability. User data may have been exposed.
- **A) Full disclosure & fix** — Costs $20,000 in incident response. Reputation -0.03 short-term but +0.02 long-term (transparency). Tech debt -0.05 (forced cleanup).
- **B) Patch quietly** — Free. Risk: 30% chance it leaks to press next month → reputation -0.15.

**"Key Developer Wants to Leave"**
*Conditions: any employee with motivation < 0.5*
> [Employee] has been talking to recruiters. They're considering leaving.
- **A) Counter-offer with a raise** — Salary +30%. Motivation resets to 0.8.
- **B) Let them go** — Employee leaves immediately. Remaining team morale -0.03.
- **C) Promise equity & interesting work** — 50% chance they stay (motivation +0.2), 50% chance they leave anyway.

#### Opportunity Cards
Good things might happen — if you make the right call.

**"Viral Blog Post"**
*Conditions: reputation > 0.5, product launched*
> A popular tech blogger wrote a glowing review of your product!
- Effect (automatic): +50% bonus new users this month. Reputation +0.05.

**"Enterprise Client Inquiry"**
*Conditions: productMaturity > 0.4, userCount > 50*
> A Fortune 500 company wants to use your product — but they need SSO and an audit log.
- **A) Build the features** — 2 months of reduced feature output (team diverted), then +$5,000/month recurring revenue and +10 users (enterprise seats). Tech debt +0.03.
- **B) Decline politely** — No effect. Reputation +0.01 (staying focused is respected).

**"Acquisition Offer"**
*Conditions: userCount > 200, unique card*
> BigCorp Inc. offers to acquire your company for [3× annual revenue].
- **A) Accept** — Game ends. Final score based on acquisition price.
- **B) Decline** — Game continues. Reputation +0.03 (market sees you as confident).

**"Funding Round Available"**
*Conditions: monthNumber > 6, cash < 300000 OR userCount > 100, unique per tier*
> VCs are impressed by your metrics. They're offering a Series A: $500,000 for a board seat.
- **A) Take the money** — +$500,000 cash. But: a "Growth Target" card is added to the deck that fires in 6 months — if you haven't doubled users by then, morale -0.1 and reputation -0.05 (board pressure).
- **B) Stay independent** — No effect.

#### Market Cards
External forces beyond the player's control.

**"New Competitor Launches"**
*Conditions: monthNumber > 12*
> A well-funded startup just launched a competing product. They're undercutting your price.
- Effect: customerAcquisitionCost increases by 30% for 3 months. Churn +2% for 3 months.

**"Market Downturn"**
*Conditions: monthNumber > 18*
> The economy is slowing. Companies are cutting software budgets.
- Effect: Churn +3% for 6 months. New user acquisition -20% for 6 months.

**"Industry Regulation"**
*Conditions: monthNumber > 24, userCount > 500*
> New data regulations require compliance changes to your product.
- **A) Invest in compliance** — $50,000 one-time cost. 1 month of diverted dev effort. Opens access to regulated industries (+15% organic growth for 6 months).
- **B) Ignore for now** — Risk: 20% chance per month of a $100,000 fine until addressed.

#### Team Cards
People-focused events that test your leadership.

**"Team Building"**
*Conditions: employees > 3*
> The team suggests an offsite retreat.
- **A) Approve it** — Costs $2,000 per employee. Motivation +0.1 for all.
- **B) Too busy right now** — Motivation -0.02 for all (mild disappointment).

**"Brilliant Candidate Available"**
*Conditions: random*
> A highly skilled developer is on the market — but they have other offers.
- **A) Hire them (premium)** — New employee with baseProductivity 1.3–1.5. Salary is 50% above normal.
- **B) Pass** — No effect.

**"Internal Conflict"**
*Conditions: employees > 5*
> Two developers disagree on a fundamental architecture decision. The team is split.
- **A) Side with Developer A** — Tech debt -0.03, motivation -0.05 for "losing" side.
- **B) Side with Developer B** — Feature output +10% for 2 months, tech debt +0.03.
- **C) Let them work it out** — 1 month of reduced output (debates). Motivation +0.02 (feeling heard).

---

## 9. Progression & Milestones

The game has three implicit phases that change the flavor of cards and challenges.

### Early Game: "The Build" (Months 1–12)
- Product is not yet launched
- Focus: hiring the initial team, building to launch maturity
- No revenue, burning through seed funding
- **Milestone: Product Launch** (productMaturity ≥ launchMaturity)
  - Guaranteed card: *"Launch Day"* — Flavor moment. Small burst of initial users from launch buzz.

### Mid Game: "The Grind" (Months 6–36)
- Product is live, users are trickling in
- Focus: finding product-market fit, managing growth vs. burn rate
- Tech debt starts to bite if neglected
- **Milestone: 100 Users**
  - Guaranteed card: *"Product Hunt Feature"* — Option to do a big marketing push. Risk/reward.
- **Milestone: Break Even** (monthly income ≥ monthly expenses)
  - Guaranteed card: *"Ramen Profitable"* — Morale boost. Reputation +0.05.
- **Milestone: First Employee Quits** (inevitable if motivation neglected)

### Late Game: "The Scale" (Months 24+)
- Larger team, more users, more complex problems
- Focus: maintaining quality at scale, fending off competitors, deciding the endgame
- Communication overhead becomes a real constraint
- **Milestone: 1,000 Users**
  - Guaranteed card: *"Series B Interest"* — Major funding opportunity.
- **Milestone: $1M ARR** (MRR × 12 ≥ 1,000,000, where MRR = sum of cohort revenues)
  - Guaranteed card: *"Magazine Cover"* — Major reputation boost. Attracts top talent (better hiring pool).

---

## 10. Win/Loss Conditions

### Loss: Bankruptcy
- **Cash drops to $0 or below.** Game over.
- "You ran out of runway. The servers are shut down and the team goes home."

### Victory Paths

There are three ways to "win," each representing a different founder philosophy:

#### Path 1: The Exit (Acquisition)
- Accept an acquisition offer when it appears (card-based, see Section 8.3).
- Acquisition price is based on current ARR multiplier.
- The faster and bigger the exit, the higher the score.

#### Path 2: The Rocket Ship (IPO)
- Reach **$10M ARR** (MRR × 12 ≥ 10,000,000, where MRR = sum of cohort revenues).
- Must also have **positive cash flow for 3 consecutive months**.
- Triggers the *"IPO Bell"* event — game ends with a big score.

#### Path 3: The Lifestyle Business (Survival)
- Survive for **120 months (10 years)** without going bankrupt.
- Must have **positive cash** and **positive cash flow** at month 120.
- Lower score than the other paths, but a valid and respectable win.

### Scoring

Final score is calculated as:

```
baseScore =
    (finalARR / 10000)                      // revenue scale
  + (cashRemaining / 1000)                  // financial health
  + (peakUserCount × 10)                    // growth achievement
  + (monthsSurvived × 50)                   // longevity

multiplier =
    1.0 (survival) | 1.5 (acquisition) | 2.0 (IPO)

speedBonus =
    max(0, (120 - monthsToVictory) × 100)  // faster = better

finalScore = (baseScore × multiplier) + speedBonus
```

---

## 11. UI Concept

### Layout
The screen is divided into:

1. **Header Bar** — Month number, cash, user count, MRR (monthly recurring revenue)
2. **Gauges Panel** — The 5 abstract gauges (product maturity, tech debt, team morale, velocity, reputation)
3. **Controls Panel** — Sales spend, product price, tech debt target (with +/- buttons)
4. **Team Panel** — List of employees with fuzzy skill gauges, salary, and fire button. Hire button at top.
5. **Card Area** — Center of screen. When a card is drawn, it appears here with choices as buttons.
6. **History Log** — A scrollable feed showing past events and key metrics changes ("Month 8: +12 users, -$4,200 cash flow")
7. **Next Month Button** — Big, prominent. This is the core action.

### Card Presentation
Cards appear as a centered "card" UI element with:
- An icon/color indicating category (red = crisis, green = opportunity, blue = market, yellow = team)
- Title in bold
- Flavor text in italic
- Choice buttons below
- Cards animate in and must be resolved before the player can advance

### Gauges
Each gauge is a row of 5 blocks/bars:
- Filled blocks = current level
- Color coding: green (good) to red (bad) — inverted for tech debt where low is good
- A subtle flicker/shimmer effect on the bars at the boundary to visually convey uncertainty

---

## 12. Balance Targets

These targets guide tuning. The game should be balanced so that:

| Scenario | Expected Outcome |
|----------|-----------------|
| Solo founder, no hires, minimal sales spend | Can launch but grows very slowly. Survives ~24 months. |
| 3-person team, moderate sales, balanced debt | Reaches ~200 users in 2 years. Can win via lifestyle path. |
| Aggressive hiring (8+), high sales spend | Either rockets to IPO in 3-4 years OR crashes from cash burn / debt / overhead. High risk, high reward. |
| Neglect tech debt entirely | Fast early growth, then cascading crises after month 18. Usually fatal. |
| Pure quality focus (low debt target) | Slow but very stable growth. Team is happy. Wins via lifestyle or late acquisition. |
| Ignore team morale | Employees leave. Replacement cost (hiring + onboarding) creates a death spiral. |

### Key Constants (tuning knobs)

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAGIC_PRODUCTIVITY_DIVIDER` | 333 | Scales raw output so maturity approaches 1 over ~5 years |
| Starting cash | $500,000 | ~18 months runway with a small team |
| Base churn | 3%/month | Industry-realistic SaaS churn |
| Base CAC | $10 | Cheap acquisition to start; events make it harder |
| Launch maturity | 0.0135 | Achievable in ~2-4 months with 1-2 devs |
| Communication overhead | 1% per line | Caps effective team at ~10 devs |
| Gauge noise | ±1 bar | Enough to create doubt, not enough to be useless |

---

## 13. Design Principles

1. **Simple inputs, complex outputs.** The player makes 5 straightforward decisions. The simulation creates emergent complexity from their interaction.

2. **Uncertainty is a feature.** The gauge system isn't a limitation — it's the core of the experience. Real founders can't see their team's exact morale score.

3. **No perfect strategy.** Every approach has tradeoffs. The game should reward adaptation over memorizing an optimal path.

4. **Cards tell stories.** Without cards, this is a spreadsheet. The cards create memorable moments ("Remember when my lead dev almost quit right before launch?").

5. **Respect the player's time.** Each turn should take 10-30 seconds. A full game should be 30-60 minutes. No grinding.

6. **Fail interestingly.** Going bankrupt should feel like a dramatic story conclusion, not a frustrating punishment. The history log should let you trace *why* you failed.

export const MAGIC_PRODUCTIVITY_DIVIDER = 333;

export function createInitialState(random) {
    random = random || Math.random;
    return {
        // time
        monthNumber: 0,
        // finances
        userCohorts: [],
        salesSpend: 0,
        productPrice: 100,
        customerAcquisitionCost: 10,
        cash: 100_000,
        // product properties
        launchMaturity: 0.0135,
        productMaturity: 0,
        marketReadyMonth: null,
        // market fit (hidden) — 0.1 to 1.0; initialized in [0.1, 0.5]
        productMarketFit: 0.1 + random() * 0.4,
        // development
        technicalDebt: 0, // 0.0 to 0.5
        technicalDebtTarget: 0.3,
        // market perception
        reputation: 0.5,
        // team
        employees: [{
            salary: 3000,
            baseProductivity: 1,
            motivation: 1,
            monthsEmployed: 0,
        }],
    }
}

export function getUserCount(state) {
    return state.userCohorts.reduce((sum, c) => sum + c.count, 0);
}

export function addUsers(state, count, price) {
    if (count <= 0) return;
    const existing = state.userCohorts.find(c => c.signupPrice === price);
    if (existing) {
        existing.count += count;
    } else {
        state.userCohorts.push({ count, signupPrice: price });
    }
}

export function removeUsers(state, count) {
    const total = getUserCount(state);
    if (count <= 0 || total === 0) return;
    const toRemove = Math.min(count, total);

    for (const cohort of state.userCohorts) {
        const proportion = cohort.count / total;
        const removeFromCohort = Math.floor(proportion * toRemove);
        cohort.count -= removeFromCohort;
    }

    let removed = total - getUserCount(state);
    if (removed < toRemove) {
        for (const cohort of state.userCohorts) {
            if (cohort.count > 0 && removed < toRemove) {
                const extra = Math.min(cohort.count, toRemove - removed);
                cohort.count -= extra;
                removed += extra;
            }
        }
    }

    state.userCohorts = state.userCohorts.filter(c => c.count > 0);
}

export function addRandomDeveloper(state, random) {
    random = random || Math.random;
    const baseProductivity = random() * 1 + 0.5;
    state.employees.push({
        salary: 3000 + Math.floor(random() * 5000 * baseProductivity),
        baseProductivity,
        motivation: 1,
        monthsEmployed: 0,
    });
}

export function pivot(state, random) {
    random = random || Math.random;
    const currentPMF = state.productMarketFit;
    // 75% chance of improvement, 25% chance of regression
    if (random() < 0.75) {
        // Sample from (currentPMF, 1.0]
        const range = 1.0 - currentPMF;
        state.productMarketFit = range > 0
            ? currentPMF + random() * range
            : 1.0;
    } else {
        // Sample from [0.1, currentPMF)
        const range = currentPMF - 0.1;
        state.productMarketFit = range > 0
            ? 0.1 + random() * range
            : 0.1;
    }
    // Lose 80% of existing users
    const usersToLose = Math.floor(getUserCount(state) * 0.8);
    removeUsers(state, usersToLose);
    // Reputation hit
    state.reputation = Math.max(0, state.reputation - 0.15);
    // Reset market warm-up (must re-establish market presence)
    const delayMonths = Math.floor(random() * 4) + 2;
    state.marketReadyMonth = state.monthNumber + delayMonths;
}

export function gameTick(state, random) {
    random = random || Math.random;
    state.monthNumber++;

    // Phase 1: Card Phase — skip (future work)

    // Phase 2: Development Phase
    const rawOutput = calculateOutput(state);
    const { featureOutput, cleanUpOutput, rawFeatureEffort } = calculateDevelopmentAllocation(state, rawOutput);
    state.productMaturity += featureOutput;
    applyTechnicalDebt(state, rawFeatureEffort, cleanUpOutput);

    // Detect launch transition and set market warm-up delay
    if (state.productMaturity >= state.launchMaturity && state.marketReadyMonth === null) {
        const delayMonths = Math.floor(random() * 4) + 2;
        state.marketReadyMonth = state.monthNumber + delayMonths;
    }

    // Phase 3: Market Phase
    const newPaidUsers = calculateNewUsers(state);
    if (newPaidUsers > 0) addUsers(state, newPaidUsers, state.productPrice);
    const organicUsers = calculateOrganicUsers(state);
    if (organicUsers > 0) addUsers(state, organicUsers, state.productPrice);
    const churnRate = calculateChurnRate(state);
    const churnedUsers = calculateChurn(state);
    removeUsers(state, churnedUsers);

    // Phase 4: Finance Phase
    state.cash += calculateIncome(state);
    state.cash -= calculateSalaryAndSalesSpend(state);
    if (state.cash <= 0) {
        state.bankrupt = true;
    }

    // Phase 5: Drift Phase
    applyMotivationDrift(state);
    applyReputationDrift(state, churnRate, organicUsers);
    for (const employee of state.employees) {
        employee.monthsEmployed++;
    }
}

export function calculateNewUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    if (state.marketReadyMonth !== null && state.monthNumber < state.marketReadyMonth) {
        return 0;
    }
    const effectiveCAC = state.customerAcquisitionCost * (state.productPrice / 100) / state.productMarketFit;
    return Math.floor(state.salesSpend / effectiveCAC);
}

export function calculateOrganicUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    const organicRate = 0.01 * state.reputation;
    return Math.floor(getUserCount(state) * organicRate);
}

export function calculateChurnRate(state) {
    const baseChurn = 0.03;
    const debtChurn = state.technicalDebt * 0.06;
    const reputationBonus = state.reputation * 0.02;
    return baseChurn + debtChurn - reputationBonus;
}

export function calculateChurn(state) {
    return Math.floor(getUserCount(state) * calculateChurnRate(state));
}

export function calculateOutput(state) {
    const collectiveProductivity = state.employees.reduce((acc, employee) => {
        return acc + calculateEmployeeProductivity(state, employee);
    }, 0);
    const n = state.employees.length;
    const communicationLines = (n * (n - 1)) / 2;
    return collectiveProductivity * (1 - state.technicalDebt) ** 2 * Math.max(0, 1 - communicationLines * 0.01);
}

export function calculateDevelopmentAllocation(state, rawOutput) {
    let cleanUpFraction = 0;
    if (state.technicalDebt > state.technicalDebtTarget) {
        cleanUpFraction = Math.min(0.5, (state.technicalDebt - state.technicalDebtTarget) * 2);
    }
    const rawFeatureEffort = rawOutput * (1 - cleanUpFraction);
    const featureOutput = rawFeatureEffort / MAGIC_PRODUCTIVITY_DIVIDER;
    const cleanUpOutput = rawOutput * cleanUpFraction;
    return { featureOutput, cleanUpOutput, rawFeatureEffort };
}




export function getMRR(state) {
    return state.userCohorts.reduce((sum, c) => sum + c.count * c.signupPrice, 0);
}

function calculateIncome(state) {
    return getMRR(state);
}

function calculateSalaryAndSalesSpend(state) {
    const payroll = state.employees.reduce((acc, employee) => {
        return acc + employee.salary;
    }, 0)
    if (state.productMaturity < state.launchMaturity) {
        return payroll;
    }
    return payroll + state.salesSpend;
}

export function applyReputationDrift(state, churnRate, organicUsers) {
    if (state.productMaturity > 0.5) state.reputation += 0.01;
    if (state.technicalDebt > 0.3) state.reputation -= 0.02;
    if (churnRate > 0.08) state.reputation -= 0.01;
    if (organicUsers > 0) state.reputation += 0.005;
    state.reputation = Math.max(0, Math.min(1, state.reputation));
}

export function applyTechnicalDebt(state, rawFeatureEffort, cleanUpOutput) {
    const debtGrowth = rawFeatureEffort * 0.01 * (1 + state.productMaturity * 5);
    const debtReduction = cleanUpOutput * 0.1;
    state.technicalDebt = Math.max(0, Math.min(0.5, state.technicalDebt - debtReduction + debtGrowth));
}

export function applyMotivationDrift(state) {
    for (const employee of state.employees) {
        if (state.technicalDebt > 0.3) employee.motivation -= 0.02;
        if (state.employees.length > 10) employee.motivation -= 0.01;
        if (employee.monthsEmployed > 12) employee.motivation -= 0.01;
        employee.motivation = Math.max(0.2, Math.min(1.5, employee.motivation));
    }
}

export function calculateEmployeeProductivity(state, employee) {
    const onboardingMultiplier = employee.monthsEmployed === 0 ? 0.33
        : employee.monthsEmployed === 1 ? 0.66
        : 1.0;
    return employee.baseProductivity * employee.motivation * onboardingMultiplier;
}
export const MAGIC_PRODUCTIVITY_DIVIDER = 333;

export function createInitialState() {
    return {
        // time
        monthNumber: 0,
        // finances
        userCount: 0,
        salesSpend: 0,
        productPrice: 100,
        customerAcquisitionCost: 10,
        cash: 500_000,
        // product properties
        launchMaturity: 0.0135,
        productMaturity: 0,
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

export function gameTick(state) {
    state.monthNumber++;

    // Phase 1: Card Phase — skip (future work)

    // Phase 2: Development Phase
    const rawOutput = calculateOutput(state);
    const { featureOutput, cleanUpOutput } = calculateDevelopmentAllocation(state, rawOutput);
    state.productMaturity += featureOutput;
    applyTechnicalDebt(state, featureOutput, cleanUpOutput);

    // Phase 3: Market Phase
    state.userCount += calculateNewUsers(state);
    const organicUsers = calculateOrganicUsers(state);
    state.userCount += organicUsers;
    const churnRate = calculateChurnRate(state);
    state.userCount -= calculateChurn(state);
    state.userCount = Math.max(0, state.userCount);

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

function calculateNewUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    return Math.floor(state.salesSpend / state.customerAcquisitionCost);
}

export function calculateOrganicUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    const organicRate = 0.01 * state.reputation;
    return Math.floor(state.userCount * organicRate);
}

export function calculateChurnRate(state) {
    const baseChurn = 0.03;
    const debtChurn = state.technicalDebt * 0.06;
    const priceChurn = Math.max(0, (state.productPrice - 100) / 5000);
    const reputationBonus = state.reputation * 0.02;
    return baseChurn + debtChurn + priceChurn - reputationBonus;
}

export function calculateChurn(state) {
    return Math.floor(state.userCount * calculateChurnRate(state));
}

export function calculateOutput(state) {
    const collectiveProductivity = state.employees.reduce((acc, employee) => {
        return acc + calculateEmployeeProductivity(state, employee);
    }, 0);
    const n = state.employees.length;
    const communicationLines = (n * (n - 1)) / 2;
    return collectiveProductivity * (1 - state.technicalDebt) * Math.max(0, 1 - communicationLines * 0.01);
}

export function calculateDevelopmentAllocation(state, rawOutput) {
    let cleanUpFraction = 0;
    if (state.technicalDebt > state.technicalDebtTarget) {
        cleanUpFraction = Math.min(0.5, (state.technicalDebt - state.technicalDebtTarget) * 2);
    }
    const featureOutput = (rawOutput * (1 - cleanUpFraction)) / MAGIC_PRODUCTIVITY_DIVIDER;
    const cleanUpOutput = rawOutput * cleanUpFraction;
    return { featureOutput, cleanUpOutput };
}




function calculateIncome(state) {
    return state.productPrice * state.userCount;
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

export function applyTechnicalDebt(state, featureOutput, cleanUpOutput) {
    const debtGrowth = featureOutput * 0.05;
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
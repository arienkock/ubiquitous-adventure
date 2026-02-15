import { createInitialState, gameTick, calculateOutput, calculateEmployeeProductivity, calculateDevelopmentAllocation, applyTechnicalDebt, calculateChurn, calculateChurnRate, applyReputationDrift, calculateOrganicUsers, applyMotivationDrift, addUsers, removeUsers, getUserCount, getMRR, calculateNewUsers, pivot, applyPMFDegradation, MAGIC_PRODUCTIVITY_DIVIDER } from './state.js';
import { addEmployees, expect, runTests } from './test-utils.js';


// --- Onboarding ---

function testOnboardingMultiplier(state) {
    // Month 0: 33% productivity
    addEmployees(state, 1, 1.0, 0);
    const emp = state.employees[0];
    expect(calculateEmployeeProductivity(state, emp)).toBe(0.33);

    // Month 1: 66% productivity
    emp.monthsEmployed = 1;
    expect(calculateEmployeeProductivity(state, emp)).toBe(0.66);

    // Month 2+: 100% productivity
    emp.monthsEmployed = 2;
    expect(calculateEmployeeProductivity(state, emp)).toBe(1.0);

    // Much later: still 100%
    emp.monthsEmployed = 24;
    expect(calculateEmployeeProductivity(state, emp)).toBe(1.0);
}

// --- Output ---

function testOutputCalculation(state) {
    // No employees -> zero output
    expect(calculateOutput(state)).toBe(0);
    // Fully onboarded team -> positive raw output
    addEmployees(state, 7, 1, 2);
    expect(calculateOutput(state)).toBeGreaterThan(0);
}

// --- Development Allocation ---

function testDevAllocationNoCleanupWhenDebtBelowTarget(state) {
    state.technicalDebt = 0.1;
    state.technicalDebtTarget = 0.3;
    const rawOutput = 10;
    const { featureOutput, cleanUpOutput } = calculateDevelopmentAllocation(state, rawOutput);
    expect(cleanUpOutput).toBe(0);
    expect(featureOutput).toBe(rawOutput / MAGIC_PRODUCTIVITY_DIVIDER);
}

function testDevAllocationCleanupWhenDebtAboveTarget(state) {
    state.technicalDebt = 0.4;
    state.technicalDebtTarget = 0.3;
    const rawOutput = 10;
    const { featureOutput, cleanUpOutput } = calculateDevelopmentAllocation(state, rawOutput);
    // cleanUpFraction = min(0.5, (0.4 - 0.3) * 2) = 0.2
    expect(cleanUpOutput).toBeCloseTo(rawOutput * 0.2);
    expect(featureOutput).toBeCloseTo((rawOutput * 0.8) / MAGIC_PRODUCTIVITY_DIVIDER);
}

function testDevAllocationCleanupCapsAt50Percent(state) {
    state.technicalDebt = 0.5;
    state.technicalDebtTarget = 0.1;
    const rawOutput = 10;
    const { featureOutput, cleanUpOutput } = calculateDevelopmentAllocation(state, rawOutput);
    // cleanUpFraction = min(0.5, (0.5 - 0.1) * 2) = min(0.5, 0.8) = 0.5
    expect(cleanUpOutput).toBe(rawOutput * 0.5);
    expect(featureOutput).toBe((rawOutput * 0.5) / MAGIC_PRODUCTIVITY_DIVIDER);
}

// --- Technical Debt ---

function testTechDebtGrowsFromFeatureWork(state) {
    state.technicalDebt = 0.1;
    state.productMaturity = 0;
    applyTechnicalDebt(state, 1.0, 0);
    // debtGrowth = rawFeatureEffort * 0.01 * (1 + maturity*5) = 1.0 * 0.01 * 1 = 0.01
    expect(state.technicalDebt).toBeCloseTo(0.11);
}

function testTechDebtShrinksFromCleanup(state) {
    state.technicalDebt = 0.3;
    applyTechnicalDebt(state, 0, 2.0);
    // debtReduction = 2.0 * 0.1 = 0.2
    expect(state.technicalDebt).toBeCloseTo(0.1);
}

function testTechDebtClampsAtZero(state) {
    state.technicalDebt = 0.05;
    applyTechnicalDebt(state, 0, 10.0);
    // debtReduction = 10.0 * 0.1 = 1.0, result would be -0.95
    expect(state.technicalDebt).toBe(0);
}

function testTechDebtClampsAtMax(state) {
    state.technicalDebt = 0.48;
    state.productMaturity = 0;
    applyTechnicalDebt(state, 10.0, 0);
    // debtGrowth = 10.0 * 0.01 * 1 = 0.1, result would be 0.58 -> clamped to 0.5
    expect(state.technicalDebt).toBe(0.5);
}

// --- Churn ---

function testChurnZeroWithNoUsers(state) {
    state.userCohorts = [];
    state.technicalDebt = 0.5;
    expect(calculateChurn(state)).toBe(0);
}

function testChurnIncreasesWithTechDebt(state) {
    addUsers(state, 1000, 100);
    state.productPrice = 100;
    state.reputation = 0;
    state.technicalDebt = 0;
    const churnLow = calculateChurn(state);
    state.technicalDebt = 0.5;
    const churnHigh = calculateChurn(state);
    expect(churnHigh).toBeGreaterThan(churnLow);
}

function testChurnUnaffectedByPrice(state) {
    addUsers(state, 1000, 100);
    state.technicalDebt = 0;
    state.reputation = 0;
    state.productPrice = 100;
    const churnBase = calculateChurn(state);
    state.productPrice = 500;
    const churnAfterPriceHike = calculateChurn(state);
    expect(churnAfterPriceHike).toBe(churnBase);
}

function testReputationReducesChurn(state) {
    addUsers(state, 1000, 100);
    state.technicalDebt = 0;
    state.productPrice = 100;
    state.reputation = 0;
    const churnNoRep = calculateChurn(state);
    state.reputation = 1.0;
    const churnGoodRep = calculateChurn(state);
    expect(churnGoodRep).toBeLessThan(churnNoRep);
}

// --- Reputation ---

function testReputationImprovesWithMatureProduct(state) {
    state.reputation = 0.5;
    state.productMaturity = 0.6;
    state.technicalDebt = 0;
    applyReputationDrift(state, 0.02, 0);
    expect(state.reputation).toBe(0.51);
}

function testReputationDegradesWithHighDebt(state) {
    state.reputation = 0.5;
    state.productMaturity = 0;
    state.technicalDebt = 0.4;
    applyReputationDrift(state, 0.02, 0);
    expect(state.reputation).toBe(0.48);
}

function testReputationClampsToRange(state) {
    // Clamps at 0
    state.reputation = 0.01;
    state.productMaturity = 0;
    state.technicalDebt = 0.4;
    applyReputationDrift(state, 0.1, 0);
    // -0.02 (debt) -0.01 (high churn) = -0.03 total, 0.01 - 0.03 = -0.02 -> clamped to 0
    expect(state.reputation).toBe(0);

    // Clamps at 1
    state.reputation = 0.99;
    state.productMaturity = 0.8;
    state.technicalDebt = 0;
    applyReputationDrift(state, 0.01, 5);
    // +0.01 (maturity) +0.005 (organic) = 0.015 total, 0.99 + 0.015 = 1.005 -> clamped to 1
    expect(state.reputation).toBe(1);
}

// --- Organic Users ---

function testOrganicUsersZeroPreLaunch(state) {
    state.productMaturity = 0;
    state.launchMaturity = 0.0135;
    addUsers(state, 1000, 100);
    state.reputation = 1.0;
    expect(calculateOrganicUsers(state)).toBe(0);
}

function testOrganicUsersScaleWithReputationAndCount(state) {
    state.productMaturity = 1.0;
    state.launchMaturity = 0.0135;
    addUsers(state, 1000, 100);

    state.reputation = 0;
    expect(calculateOrganicUsers(state)).toBe(0);

    state.reputation = 0.5;
    // organicRate = 0.01 * 0.5 = 0.005, floor(1000 * 0.005) = 5
    expect(calculateOrganicUsers(state)).toBe(5);

    state.reputation = 1.0;
    // organicRate = 0.01 * 1.0 = 0.01, floor(1000 * 0.01) = 10
    expect(calculateOrganicUsers(state)).toBe(10);
}

// --- Motivation Drift ---

function testMotivationDropsWithHighDebt(state) {
    addEmployees(state, 1, 1.0, 2);
    state.technicalDebt = 0.4;
    const before = state.employees[0].motivation;
    applyMotivationDrift(state);
    expect(state.employees[0].motivation).toBe(before - 0.02);
}

function testMotivationDropsWithLargeTeam(state) {
    addEmployees(state, 11, 1.0, 2);
    state.technicalDebt = 0;
    const before = state.employees[0].motivation;
    applyMotivationDrift(state);
    expect(state.employees[0].motivation).toBe(before - 0.01);
}

function testMotivationDropsWithLongTenure(state) {
    addEmployees(state, 1, 1.0, 13);
    state.technicalDebt = 0;
    const before = state.employees[0].motivation;
    applyMotivationDrift(state);
    expect(state.employees[0].motivation).toBe(before - 0.01);
}

function testMotivationClampsToRange(state) {
    addEmployees(state, 1, 1.0, 2);
    state.technicalDebt = 0;

    // Clamp at min
    state.employees[0].motivation = 0.2;
    state.technicalDebt = 0.4;
    applyMotivationDrift(state);
    expect(state.employees[0].motivation).toBe(0.2);

    // Clamp at max
    state.employees[0].motivation = 1.5;
    state.technicalDebt = 0;
    applyMotivationDrift(state);
    expect(state.employees[0].motivation).toBe(1.5);
}

// --- Maturity ---

/*
This test checks that maturity progresses meaningfully over 5 years with a team of 7
fully-onboarded developers. With the full simulation (tech debt growth, motivation drift
from long tenure), maturity grows slower than the theoretical max.
If this test fails, check MAGIC_PRODUCTIVITY_DIVIDER and drift parameters.
*/
function testMaturityEvolution(state) {
    addEmployees(state, 7, 1, 2);
    state.technicalDebtTarget = 0; // aggressive cleanup to keep debt low
    let previousMaturity = state.productMaturity;
    for (let i = 0; i < 12 * 5; i++) {
        gameTick(state);
        // Maturity should always increase (team is always producing some output)
        expect(state.productMaturity).toBeGreaterThan(previousMaturity);
        previousMaturity = state.productMaturity;
    }
    // With motivation drift from long tenure, tech debt dynamics, and quadratic penalty,
    // maturity grows slower than before but should still exceed 0.5
    expect(state.productMaturity).toBeGreaterThan(0.5);
    expect(state.productMaturity).toBeLessThan(1);
}

function testLaunchMaturity(state) {
    expect(state.launchMaturity).toBeGreaterThan(0);
    addEmployees(state, 1, 0.8, 2);

    for (let i = 0; i < 6; i++) {
        gameTick(state);
    }
    // whatever we change in the algorithms, a product should launch in its first 6 months
    // with this setup
    expect(state.productMaturity).toBeGreaterThan(state.launchMaturity);
}

// --- Finance ---

function testCashReducedBySalaryAndSalesSpend(state) {
    state.cash = 100000;
    state.salesSpend = 1000;
    state.launchMaturity = 999999;
    addEmployees(state, 2, 1, 2);
    for (let i = 0; i < 3; i++) {
        gameTick(state);
    }
    expect(state.cash).toBe(100000 - (6000 * 3));
}

// --- Integration: gameTick phases ---

function testBankruptcyDetected(state) {
    addEmployees(state, 3, 1, 2);
    state.cash = 10000;
    state.salesSpend = 0;
    // With 3 employees at $3000/month = $9000/month expenses and no revenue,
    // cash runs out quickly
    let bankrupt = false;
    for (let i = 0; i < 3; i++) {
        gameTick(state);
        if (state.bankrupt) {
            bankrupt = true;
            break;
        }
    }
    expect(bankrupt).toBe(true);
}

function testMonthsEmployedIncrements(state) {
    addEmployees(state, 1, 1, 0);
    expect(state.employees[0].monthsEmployed).toBe(0);
    gameTick(state);
    expect(state.employees[0].monthsEmployed).toBe(1);
    gameTick(state);
    expect(state.employees[0].monthsEmployed).toBe(2);
}

function testTechDebtGrowsDuringGameTick(state) {
    addEmployees(state, 3, 1, 2);
    state.technicalDebt = 0;
    state.technicalDebtTarget = 0.5; // high target so no cleanup
    const debtBefore = state.technicalDebt;
    gameTick(state);
    expect(state.technicalDebt).toBeGreaterThan(debtBefore);
}

function testMarketWarmUpDelaysFirstUsers(state) {
    addEmployees(state, 1, 1, 2);
    state.productMaturity = 0.02;
    state.launchMaturity = 0.0135;
    state.marketReadyMonth = null;
    state.salesSpend = 10000;
    const randomZero = () => 0;
    gameTick(state, randomZero);
    expect(getUserCount(state)).toBe(0);
    gameTick(state, randomZero);
    expect(getUserCount(state)).toBe(0);
    gameTick(state, randomZero);
    expect(getUserCount(state)).toBeGreaterThan(0);
}

function testHigherPriceReducesNewUserAcquisition(state) {
    const setup = (s) => {
        addEmployees(s, 1, 1, 2);
        s.productMaturity = 0.02;
        s.marketReadyMonth = 0;
        s.salesSpend = 10000;
        s.reputation = 0;
        s.technicalDebt = 0;
        s.productMarketFit = 0.5;
    };
    setup(state);
    state.productPrice = 100;
    gameTick(state);
    const usersAtLowPrice = getUserCount(state);

    const state2 = createInitialState();
    state2.employees = [];
    setup(state2);
    state2.productPrice = 500;
    gameTick(state2);
    const usersAtHighPrice = getUserCount(state2);
    expect(usersAtHighPrice).toBeLessThan(usersAtLowPrice);
}

function testCohortIncomeUsesSignupPrice(state) {
    addUsers(state, 100, 50);
    addUsers(state, 200, 100);
    expect(getUserCount(state)).toBe(300);
    expect(getMRR(state)).toBe(100 * 50 + 200 * 100);
}

function testSoloFounderSurvives18Months(state) {
    // Solo founder (1 employee from createInitialState, which runTests clears)
    // Add back a single founder-like employee
    addEmployees(state, 1, 1, 0);
    state.cash = 500_000;
    state.salesSpend = 0;
    for (let i = 0; i < 18; i++) {
        gameTick(state);
    }
    // Should survive at least 18 months burning only $3000/month salary
    expect(state.bankrupt !== true).toBe(true);
    expect(state.cash).toBeGreaterThan(0);
}

function testSoloDevWith100kStruggles(state) {
    addEmployees(state, 1, 1, 0);
    state.cash = 100_000;
    state.salesSpend = 0;
    state.productMarketFit = 0.3;
    state.pmfPeakValue = 0.3;
    state.pmfLifecycleMonths = 180; // slow degradation so test isn't affected
    state.technicalDebtTarget = 0.5; // not managing debt
    const random = () => 0.5; // deterministic for market warm-up

    // Develop until launch
    while (state.productMaturity < state.launchMaturity) {
        gameTick(state, random);
    }

    // Debt should be meaningful by launch time
    expect(state.technicalDebt).toBeGreaterThan(0.03);

    // No paid acquisition — bootstrap scenario shows runway pressure
    while (state.monthNumber < 24) {
        gameTick(state, random);
    }

    // After 2 years: tech debt has compounded, cash is depleted
    expect(state.technicalDebt).toBeGreaterThan(0.1);
    expect(state.cash).toBeLessThan(60_000);
}

// --- Product Market Fit ---

function testPMFInitializedInRange(state) {
    // createInitialState generates PMF in [0.1, 0.5]
    // state was created by runTests via createInitialState()
    const fresh = createInitialState();
    expect(fresh.productMarketFit).toBeGreaterThanOrEqual(0.1);
    expect(fresh.productMarketFit).toBeLessThanOrEqual(0.5);
}

function testPMFReducesNewUserAcquisition(state) {
    state.productMaturity = 0.02;
    state.launchMaturity = 0.0135;
    state.marketReadyMonth = 0;
    state.monthNumber = 1;
    state.salesSpend = 1000;
    state.productPrice = 100;
    state.customerAcquisitionCost = 10;

    // Low PMF -> high effective CAC -> fewer users
    state.productMarketFit = 0.1;
    const usersLowPMF = calculateNewUsers(state);

    // High PMF -> low effective CAC -> more users
    state.productMarketFit = 1.0;
    const usersHighPMF = calculateNewUsers(state);

    expect(usersHighPMF).toBeGreaterThan(usersLowPMF);
    // At PMF 0.1: effectiveCAC = 10/0.1 = 100, users = floor(1000/100) = 10
    expect(usersLowPMF).toBe(10);
    // At PMF 1.0: effectiveCAC = 10/1.0 = 10, users = floor(1000/10) = 100
    expect(usersHighPMF).toBe(100);
}

function testPMFDegradesOverTime(state) {
    state.productMarketFit = 0.5;
    state.pmfPeakValue = 0.5;
    state.pmfLifecycleMonths = 60; // rate = 0.4/60 ≈ 0.00667/month
    const before = state.productMarketFit;
    applyPMFDegradation(state);
    expect(state.productMarketFit).toBeLessThan(before);
    expect(state.productMarketFit).toBeCloseTo(0.5 - (0.5 - 0.1) / 60);
}

function testPMFDoesNotDegradeBelowMinimum(state) {
    state.productMarketFit = 0.2;
    state.pmfPeakValue = 0.2;
    state.pmfLifecycleMonths = 10; // rate = 0.1/10 = 0.01/month
    for (let i = 0; i < 20; i++) {
        applyPMFDegradation(state);
    }
    expect(state.productMarketFit).toBe(0.1);
}

function testPivotResetsPMFLifecycle(state) {
    state.productMarketFit = 0.3;
    state.pmfPeakValue = 0.3;
    state.pmfLifecycleMonths = 100;
    const random = () => 0.5; // improvement branch, newPMF = 0.65, delay = 4, lifecycle = 120
    pivot(state, random);
    expect(state.pmfPeakValue).toBeCloseTo(0.65);
    expect(state.pmfLifecycleMonths).toBe(120); // 60 + floor(0.5 * 121)
}

// --- Pivot ---

function testPivotRerollsPMFBetter(state) {
    state.productMarketFit = 0.2;
    // random() returns 0.5 (< 0.75 → improvement branch)
    // then 0.5 for sampling: newPMF = 0.2 + 0.5 * (1.0 - 0.2) = 0.2 + 0.4 = 0.6
    // then 0.5 for market delay: floor(0.5 * 4) + 2 = 4
    const random = () => 0.5;
    pivot(state, random);
    expect(state.productMarketFit).toBeCloseTo(0.6);
}

function testPivotRerollsPMFWorse(state) {
    state.productMarketFit = 0.5;
    // First call: 0.8 (>= 0.75 → regression branch)
    // Second call: 0.5 for sampling: newPMF = 0.1 + 0.5 * (0.5 - 0.1) = 0.1 + 0.2 = 0.3
    // Third call: 0.5 for market delay
    // Fourth call: 0.5 for pmfLifecycleMonths
    let callIndex = 0;
    const values = [0.8, 0.5, 0.5, 0.5];
    const random = () => values[callIndex++];
    pivot(state, random);
    expect(state.productMarketFit).toBeCloseTo(0.3);
}

function testPivotRemoves80PercentOfUsers(state) {
    addUsers(state, 1000, 100);
    state.productMarketFit = 0.3;
    const random = () => 0.5;
    pivot(state, random);
    // floor(1000 * 0.8) = 800 removed, 200 remain
    expect(getUserCount(state)).toBe(200);
}

function testPivotReducesReputation(state) {
    state.reputation = 0.5;
    state.productMarketFit = 0.3;
    const random = () => 0.5;
    pivot(state, random);
    expect(state.reputation).toBeCloseTo(0.35);
}

function testPivotReputationClampsAtZero(state) {
    state.reputation = 0.1;
    state.productMarketFit = 0.3;
    const random = () => 0.5;
    pivot(state, random);
    expect(state.reputation).toBe(0);
}

function testPivotResetsMarketReadyMonth(state) {
    state.monthNumber = 10;
    state.marketReadyMonth = 5; // already past
    state.productMarketFit = 0.3;
    // random calls: 0.5 (branch), 0.5 (PMF sample), 0.5 (delay: floor(0.5*4)+2 = 4)
    const random = () => 0.5;
    pivot(state, random);
    expect(state.marketReadyMonth).toBe(14); // 10 + 4
}

function testPivotAtFloorPMFStaysAtFloor(state) {
    state.productMarketFit = 0.1;
    // First call: 0.8 (>= 0.75 → regression branch)
    // range = 0.1 - 0.1 = 0 → stays at 0.1
    // Fourth call: pmfLifecycleMonths
    let callIndex = 0;
    const values = [0.8, 0.5, 0.5, 0.5];
    const random = () => values[callIndex++];
    pivot(state, random);
    expect(state.productMarketFit).toBe(0.1);
}

runTests(
    testOnboardingMultiplier,
    testOutputCalculation,
    testDevAllocationNoCleanupWhenDebtBelowTarget,
    testDevAllocationCleanupWhenDebtAboveTarget,
    testDevAllocationCleanupCapsAt50Percent,
    testTechDebtGrowsFromFeatureWork,
    testTechDebtShrinksFromCleanup,
    testTechDebtClampsAtZero,
    testTechDebtClampsAtMax,
    testChurnZeroWithNoUsers,
    testChurnIncreasesWithTechDebt,
    testChurnUnaffectedByPrice,
    testReputationReducesChurn,
    testReputationImprovesWithMatureProduct,
    testReputationDegradesWithHighDebt,
    testReputationClampsToRange,
    testOrganicUsersZeroPreLaunch,
    testOrganicUsersScaleWithReputationAndCount,
    testMotivationDropsWithHighDebt,
    testMotivationDropsWithLargeTeam,
    testMotivationDropsWithLongTenure,
    testMotivationClampsToRange,
    testMaturityEvolution,
    testLaunchMaturity,
    testCashReducedBySalaryAndSalesSpend,
    testBankruptcyDetected,
    testMonthsEmployedIncrements,
    testTechDebtGrowsDuringGameTick,
    testMarketWarmUpDelaysFirstUsers,
    testHigherPriceReducesNewUserAcquisition,
    testCohortIncomeUsesSignupPrice,
    testSoloFounderSurvives18Months,
    testSoloDevWith100kStruggles,
    testPMFInitializedInRange,
    testPMFReducesNewUserAcquisition,
    testPMFDegradesOverTime,
    testPMFDoesNotDegradeBelowMinimum,
    testPivotResetsPMFLifecycle,
    testPivotRerollsPMFBetter,
    testPivotRerollsPMFWorse,
    testPivotRemoves80PercentOfUsers,
    testPivotReducesReputation,
    testPivotReputationClampsAtZero,
    testPivotResetsMarketReadyMonth,
    testPivotAtFloorPMFStaysAtFloor,
);
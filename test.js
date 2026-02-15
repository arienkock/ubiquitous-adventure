import { gameTick, calculateOutput, calculateEmployeeProductivity, calculateDevelopmentAllocation, applyTechnicalDebt, calculateChurn, calculateChurnRate, applyReputationDrift, calculateOrganicUsers, applyMotivationDrift, MAGIC_PRODUCTIVITY_DIVIDER } from './state.js';
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
    applyTechnicalDebt(state, 1.0, 0);
    // debtGrowth = 1.0 * 0.05 = 0.05
    expect(state.technicalDebt).toBeCloseTo(0.15);
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
    applyTechnicalDebt(state, 10.0, 0);
    // debtGrowth = 10.0 * 0.05 = 0.5, result would be 0.98
    expect(state.technicalDebt).toBe(0.5);
}

// --- Churn ---

function testChurnZeroWithNoUsers(state) {
    state.userCount = 0;
    state.technicalDebt = 0.5;
    expect(calculateChurn(state)).toBe(0);
}

function testChurnIncreasesWithTechDebt(state) {
    state.userCount = 1000;
    state.productPrice = 100;
    state.reputation = 0;
    state.technicalDebt = 0;
    const churnLow = calculateChurn(state);
    state.technicalDebt = 0.5;
    const churnHigh = calculateChurn(state);
    expect(churnHigh).toBeGreaterThan(churnLow);
}

function testChurnIncreasesWithHighPrice(state) {
    state.userCount = 1000;
    state.technicalDebt = 0;
    state.reputation = 0;
    state.productPrice = 100;
    const churnBase = calculateChurn(state);
    state.productPrice = 500;
    const churnExpensive = calculateChurn(state);
    expect(churnExpensive).toBeGreaterThan(churnBase);
}

function testReputationReducesChurn(state) {
    state.userCount = 1000;
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
    state.userCount = 1000;
    state.reputation = 1.0;
    expect(calculateOrganicUsers(state)).toBe(0);
}

function testOrganicUsersScaleWithReputationAndCount(state) {
    state.productMaturity = 1.0;
    state.launchMaturity = 0.0135;
    state.userCount = 1000;

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
    // With motivation drift from long tenure and tech debt dynamics,
    // maturity won't reach 0.9 but should exceed 0.7
    expect(state.productMaturity).toBeGreaterThan(0.7);
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
    testChurnIncreasesWithHighPrice,
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
    testSoloFounderSurvives18Months,
);
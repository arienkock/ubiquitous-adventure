import { gameTick, calculateOutput } from './state.js';
import { addEmployees, expect, runTests } from './test-utils.js';



/*
This test checks that the maturity gets close to 1 when a team of 7 (fully-onboarded) developers 
works on the product for 5 years.  
If this test fails, the constant MAGIC_PRODUCTIVITY_DIVIDER needs to be adjusted.
*/
function testMaturityEvolution(state) {
    addEmployees(state, 7, 1);
    let previousMaturity = state.productMaturity;
    let previousDerivative = 0;
    let derivative = 0;
    for (let i = 0; i < 12 * 5; i++) {
        gameTick(state);
        expect(state.productMaturity).toBeGreaterThan(previousMaturity);
        derivative = state.productMaturity - previousMaturity;
        if (i > 1) {
            // Allow tiny tolerance for floating point
            expect(derivative).toBeLessThanOrEqual(previousDerivative + 1e-10);
        }
        previousDerivative = derivative;
        previousMaturity = state.productMaturity;
    }
    expect(state.productMaturity).toBeGreaterThan(0.9);
    // TODO: uncomment when development is slowed down by productivity penalties
    expect(state.productMaturity).toBeLessThan(1);
}

function testLaunchMaturity(state) {
    expect(state.launchMaturity).toBeGreaterThan(0);
    addEmployees(state, 1, 0.8);

    for (let i = 0; i < 6; i++) {
        gameTick(state);
    }
    // whatever we change in the algorithms, a product should launch in its first 6 months
    // with this setup
    expect(state.productMaturity).toBeGreaterThan(state.launchMaturity);
}

function testOutputCalculation(state) {
    expect(calculateOutput(state)).toBe(0);
    addEmployees(state, 7, 1);
    state.monthNumber = 10;
    expect(calculateOutput(state)).toBeGreaterThan(0);
}

function testCashReducedBySalaryAndSalesSpend(state) {
    state.cash = 100000;
    state.salesSpend = 1000;
    state.launchMaturity = 999999;
    addEmployees(state, 2, 1);
    for (let i = 0; i < 3; i++) {
        gameTick(state);
    }
    expect(state.cash).toBe(100000 - (6000 * 3));
}

runTests(
    testMaturityEvolution, 
    testOutputCalculation,
    testLaunchMaturity,
    testCashReducedBySalaryAndSalesSpend
);
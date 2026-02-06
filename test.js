import { gameTick, roles, calculateEmployeeProductivity, calculateOutput, initializeState } from './state.js';
import { addEmployees, expect, runTests } from './test-utils.js';



/*
This test checks that the maturity gets close to 1 when a team of 7 (fully-onboarded) developers 
works on the product for 5 years.  If this test fails, the values for MATURITY_OUTPUT_DROPOFF_FACTOR and
BASE_OUTPUT_DROPOFF_FACTOR need to be adjusted.
*/
function testMaturityEvolution(state) {
    addEmployees(state, 7, roles.DEVELOPER, 1, true);
    let previousMaturity = state.productMaturity;
    let previousDerivative = 0;
    let derivative = 0;
    for (let i = 0; i < 12 * 5; i++) {
        gameTick(state);
        expect(state.productMaturity).toBeGreaterThan(previousMaturity);
        derivative = state.productMaturity - previousMaturity;
        if (i > 1) {
            expect(derivative).toBeLessThan(previousDerivative);
        }
        previousDerivative = derivative;
        previousMaturity = state.productMaturity;
    }
    expect(state.productMaturity).toBeGreaterThan(0.9);
    expect(state.productMaturity).toBeLessThan(1);
}

function testCalculateEmployeeProductivity(state) {
    addEmployees(state, 1, roles.DEVELOPER, 1);
    state.productMaturity = 0.5; // because 0 maturity means green field, means full productivity from the beginning
    const employee = state.employees[0];
    expect(calculateEmployeeProductivity(state, employee)).toBe(0);
    gameTick(state);
    expect(calculateEmployeeProductivity(state, employee)).toBeGreaterThan(0);
    let previousProductivity = calculateEmployeeProductivity(state, employee);
    for (let i = 0; i < 500; i++) {
        gameTick(state);
        expect(calculateEmployeeProductivity(state, employee)).toBeGreaterThan(previousProductivity);
        previousProductivity = calculateEmployeeProductivity(state, employee);
        if (previousProductivity >= employee.baseProductivity * employee.motivation) {
            break;
        }
    }
    expect(calculateEmployeeProductivity(state, employee)).toBe(employee.baseProductivity * employee.motivation);
}

function testLaunchMaturity(state) {
    initializeState(state, () => 0.5);
    state.salesSpend = 1000;
    expect(state.launchMaturity).toBeGreaterThan(0);
    expect(state.launchMaturity).toBeLessThan(1);
    addEmployees(state, 1, roles.DEVELOPER, 0.8);

    for (let i = 0; i < 12 * 5; i++) {
        gameTick(state);
        console.log(state.productMaturity, state.launchMaturity);
        // After 4 months, the product should be launched and users should start coming in
        if (i > 4) {
            expect(state.userCount).toBeGreaterThan(0);
        } else {
            expect(state.userCount).toBe(0);
        }
    }
}

function testOutputCalculation(state) {
    expect(calculateOutput(state)).toBe(0);
    addEmployees(state, 7, roles.DEVELOPER, 1);
    state.monthNumber = 10;
    expect(calculateOutput(state)).toBeGreaterThan(0);
}

runTests(
    testMaturityEvolution, 
    testCalculateEmployeeProductivity,
    testOutputCalculation,
    testLaunchMaturity
);
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
        cash: 50_0000,
        // product properties
        launchMaturity: 0.0135,
        productMaturity: 0,
        // development
        technicalDebt: 0, // 0.1 to 0.5
        cleanUpEffort: 0,
        // team
        employees: [{
            salary: 3000,
            baseProductivity: 1,
            motivation: 1,
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
    });
}

export function gameTick(state) {
    state.monthNumber++;
    // sales
    state.userCount += calculateNewUsers(state);
    state.userCount -= calculateChurn(state);
    state.cash += calculateIncome(state);
    state.cash -= calculateSalaryAndSalesSpend(state);
    // development
    const output = calculateOutput(state);
    state.productMaturity += output
    
}

function calculateNewUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    return Math.floor(state.salesSpend / state.customerAcquisitionCost);
}

function calculateChurn(state) {
    // TODO: Implement churn
    return 0;
}

export function calculateOutput(state) {
    const collectiveProductivity = state.employees.reduce((acc, employee) => {
        return acc + calculateEmployeeProductivity(state, employee);
    }, 0);
    const n = state.employees.length;
    const communicationLines = (n * (n - 1)) / 2;
    return (collectiveProductivity * (1 - state.technicalDebt) * (1 - communicationLines * 0.01)) / MAGIC_PRODUCTIVITY_DIVIDER;
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

export function calculateEmployeeProductivity(state, employee) {
    return employee.baseProductivity * employee.motivation
}
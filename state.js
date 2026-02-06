// ES6 module entrypoint

export const roles = Object.freeze({
    DEVELOPER: "developer",
    QA: "qa",
    PM: "pm",
    DESIGNER: "designer",
    SALES: "sales",
});

const firstNames = [
    "Sequoia",
    "Raphael",
    "Snooty",
    "Poroneia",
    "Flaxon",
    "Zilvi",
    "Livyn",
    "Ezro",
    "Xenia",
    "Thimble",
    "Tigris",
    "Bax",
    "Ezra",
]

const lastNames = [
    "Boopers",
    "Raphalina",
    "Xenturia",
    "Tonks",
    "Zeora",
    "Boompkins",
    "Serenda",
    "Coops",
    "Delvina",
    "Lili",
    "Yoto",
    "Blansen"
]

const TECH_DEBT_TARGET_MIN = 0.1;
const TECH_DEBT_TARGET_MAX = 0.9;
const COMMUNICATION_OVERHEAD_FACTOR = 1 / 7;
const MIN_ONBOARDING_MONTHS = 1;
const MAX_ONBOARDING_MONTHS_AT_MATURITY_1 = 12;

const MATURITY_OUTPUT_DROPOFF_FACTOR = 700;
const BASE_OUTPUT_DROPOFF_FACTOR = 100;

export const initialState = Object.freeze({
    // immutable state that does not evolve during the game
    HIDDEN_PRODUCT_MARKET_FIT_SCORE: 0,
    MARKET_FIT_REVEAL_MONTH: 4,
    STARTING_CASH: 10000,
    // mutable state that evolves during the game
    monthNumber: 1,
    productPrice: 10,
    userCount: 0,
    cash: null,
    // increases as development progresses
    productMaturity: 0, // 0-1
    qualityScore: 0.9, // 0-0.9
    maintainabilityScore: 1, // 0.1-1
    // affects quality score
    technicalDebtTarget: TECH_DEBT_TARGET_MIN,
    launchMaturity: null, // 0-1
    customerAcquisitionCost: null,
    salesSpend: 0,
    employees: [],
});

const employeeZero = {
    name: getRandomName(),
    baseProductivity: 1, // -0.2 - +1
    motivation: 1, // 0-1
    hiredInMonth: 1,
    salary: 3000,
    role: roles.DEVELOPER
}

export function initializeState(state, random) {
    random = random || Math.random;
    Object.assign(state, initialState);
    state.cash = initialState.STARTING_CASH;
    state.technicalDebtTarget = TECH_DEBT_TARGET_MIN;
    state.HIDDEN_PRODUCT_MARKET_FIT_SCORE = random()
    state.customerAcquisitionCost = state.HIDDEN_PRODUCT_MARKET_FIT_SCORE * 250 + 50;
    state.launchMaturity = random() * 0.05 + 0.01
}



function getRandomName(exclude = []) {
    let candidate;
    do {
        candidate = firstNames[Math.floor(Math.random() * firstNames.length)] + " " + lastNames[Math.floor(Math.random() * lastNames.length)];
    } while (exclude.includes(candidate));
    return candidate;
}

export function gameTick(state) {
    state.monthNumber++;
    // sales
    state.userCount += calculateNewUsers(state);
    state.userCount -= calculateChurn(state);
    state.cash += calculateIncome(state);
    // development
    state.productMaturity += calculateOutput(state);
}

function calculateNewUsers(state) {
    if (state.productMaturity < state.launchMaturity) {
        return 0;
    }
    return Math.floor(state.salesSpend / state.customerAcquisitionCost);
}

function calculateChurn(state) {
    const churnRate = 1 - state.productMaturity * state.qualityScore;
    return Math.max(0, Math.floor(state.userCount * churnRate));
}

export function calculateOutput(state) {
    // use Brooks' Law to calculate the performance factor
    const collectiveProductivity = state.employees.reduce((acc, employee) => {
        return acc + calculateEmployeeProductivity(state, employee);
    }, 0);
    const n = state.employees.length;
    const netOutput = collectiveProductivity// - (COMMUNICATION_OVERHEAD_FACTOR * n * (n - 1)) / 2;

    return netOutput / (BASE_OUTPUT_DROPOFF_FACTOR + MATURITY_OUTPUT_DROPOFF_FACTOR * state.productMaturity);
}

function calculateIncome(state) {
    return state.productPrice * state.userCount;
}

export function calculateEmployeeProductivity(state, employee) {
    if (state.monthNumber - employee.hiredInMonth > 0) {
        const monthsSinceHire = state.monthNumber - employee.hiredInMonth;
        // High performers onboard faster
        // The more mature the product, the slower the onboarding
        // The lower the maintainabilityScore, the slower the onboarding
        let onBoardingPenaltyFactor = 1;
        const expecteOnboardingMonths = (MAX_ONBOARDING_MONTHS_AT_MATURITY_1 * state.productMaturity) / state.maintainabilityScore;
        if (monthsSinceHire > expecteOnboardingMonths) {
            onBoardingPenaltyFactor = 1;
        } else {
            onBoardingPenaltyFactor = monthsSinceHire / expecteOnboardingMonths;
        }
        return employee.baseProductivity * employee.motivation * onBoardingPenaltyFactor;
    } else {
        return 0;
    }
}
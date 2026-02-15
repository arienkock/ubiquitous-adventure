import { createInitialState } from './state.js';

export function addEmployees(state, count, productivity, monthsEmployed = 0) {
    for (let i = 0; i < count; i++) {
        state.employees.push({
            baseProductivity: productivity,
            motivation: 1,
            salary: 3000,
            monthsEmployed,
        });
    }
}

export function runTests(...tests) {
    const includeTests = new URLSearchParams(window.location.search).get("tests")?.split(",") || [];
    createBaseHTML()
    try {
        tests.forEach(test => {
            if (includeTests.length > 0 && !includeTests.includes(test.name)) {
                createTestResultHTML(test.name, null);
                return;
            }
            try {
                const state = createInitialState();
                state.employees = [];
                test(state);
                console.log("Test passed: " + test.name);
                createTestResultHTML(test.name, true);
            }
            catch (error) {
                console.log("Test failed: " + test.name);
                console.error(error);
                createTestResultHTML(test.name, false, error);
            }
        });
        }
    catch (error) {
        console.error(error);
    }
}
function createTestResultHTML(testName, passed, error) {
    const includeTests = new URLSearchParams(window.location.search).get("tests")?.split(",") || [];
    const testDisplayName = testName.replace(/([A-Z])/g, ' $1').trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    const testResultHTML = `
    <div class="test-result ${passed === null ? "skipped" : passed ? "passed" : "failed"}">
    <h2>${testDisplayName}</h2>
    <p>
    <a href="/test?tests=${testName}">Only</a>
    <a href="/test?tests=${includeTests},${testName}">Include</a>
    </p>
    <p>${passed === null ? "Skipped" : passed ? "Passed" : "Failed"}</p>
    <p>${error ? error.message : ""}</p>
    <pre>${error ? error.stack.split("\n").filter(line => !line.includes("test-utils.js")).join("\n") : ""}</pre>
    </div>
    `;
    document.getElementById("test-results").innerHTML += testResultHTML;
}

function createBaseHTML() {
    document.body.innerHTML = `
    <html>
    <head>
    <style>
    body {
    font-family: Arial, sans-serif;
    }
    #test-results * {
    padding: 0.1rem;
    margin: 0.1rem;
    }
    .test-result {
    border: 1px solid #ccc;
    padding: 10px;
    margin: 10px;
    border-radius: 5px;
    }
    .test-result.passed {
    background-color: #d4edda;
    }
    .test-result.failed {
    background-color: #f8d7da;
    }
    .test-result.skipped {
    background-color: #e2e3e5;
    }
    </style>
    </head>
    <body>
    <h1>Tests</h1>
    <p>
    <a href="/test">Run all</a>
    </p>
    <div id="test-results"></div>
    </body>
    </html>
    `;
}


export function expect(value) {
    return {
        toBe: (expected) => {
            if (value !== expected) {
                throw new Error("Expected value to be " + expected + ", but got " + value);
            }
        },
        toBeGreaterThan: (expected) => {
            if (value <= expected) {
                throw new Error("Expected value to be greater than " + expected + ", but got " + value);
            }
        },
        toBeLessThan: (expected) => {
            if (value >= expected) {
                throw new Error("Expected value to be less than " + expected + ", but got " + value);
            }
        },
        toBeLessThanOrEqual: (expected) => {
            if (value > expected) {
                throw new Error("Expected value to be less than or equal to " + expected + ", but got " + value);
            }
        },
        toBeGreaterThanOrEqual: (expected) => {
            if (value < expected) {
                throw new Error("Expected value to be greater than or equal to " + expected + ", but got " + value);
            }
        },
        toBeCloseTo: (expected, precision = 10) => {
            const epsilon = Math.pow(10, -precision);
            if (Math.abs(value - expected) > epsilon) {
                throw new Error("Expected value to be close to " + expected + " (±" + epsilon + "), but got " + value);
            }
        },
    }
}

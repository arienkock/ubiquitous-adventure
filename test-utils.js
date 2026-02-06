import { initialState } from './state.js';

export function addEmployees(state, count, role, productivity, onboarded) {
    for (let i = 0; i < count; i++) {
        state.employees.push({
            name: "Test Employee " + i,
            baseProductivity: productivity,
            motivation: 1,
            hiredInMonth: onboarded ? state.monthNumber - 1000 : state.monthNumber,
            salary: 3000,
            role: role,
        });
    }
}

export function runTests(...tests) {
    createBaseHTML()
    try {
        tests.forEach(test => {
            try {
                const state = JSON.parse(JSON.stringify(initialState));
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
    const testResultHTML = `
    <div class="test-result ${passed ? "passed" : "failed"}">
    <h2>${testName}</h2>
    <p>${passed ? "Passed" : "Failed"}</p>
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
    </style>
    </head>
    <body>
    <h1>Tests</h1>
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
        }
    }
}

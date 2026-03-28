#!/usr/bin/env node

/**
 * Sandbox Test Script
 * Tests the 3-tier code sandbox without running the full UI
 */

import { detectCodeTier, executeCode } from './lib/codeSandbox.js';

console.log('🧪 Testing 3-Tier Code Sandbox\n');

// Test cases
const testCases = [
    {
        name: 'Tier 1 - Pure Math',
        code: 'const result = 123 * 456; result;',
        expected: 'pure'
    },
    {
        name: 'Tier 1 - Data Transform',
        code: 'const data = [1,2,3].map(x => x * 2); data;',
        expected: 'pure'
    },
    {
        name: 'Tier 2 - DOM Access',
        code: 'document.querySelector("#app").innerHTML = "Hello";',
        expected: 'dom'
    },
    {
        name: 'Tier 2 - Create Element',
        code: 'const div = document.createElement("div"); div.className = "test";',
        expected: 'dom'
    },
    {
        name: 'Tier 3 - File System',
        code: 'const fs = require("fs"); fs.readFileSync("/etc/passwd");',
        expected: 'full'
    },
    {
        name: 'Tier 3 - Network Request',
        code: 'fetch("https://api.example.com/data").then(r => r.json());',
        expected: 'full'
    },
    {
        name: 'Tier 3 - Process Access',
        code: 'console.log(process.env.SECRET_KEY);',
        expected: 'full'
    },
    {
        name: 'Tier 3 - Child Process',
        code: 'const { exec } = require("child_process"); exec("ls -la");',
        expected: 'full'
    }
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
    const { tier, operations } = detectCodeTier(test.code);
    const success = tier === test.expected;
    
    if (success) {
        console.log(`✅ ${test.name}`);
        console.log(`   Tier: ${tier} | Operations: ${operations.join(', ')}`);
        passed++;
    } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Expected: ${test.expected}, Got: ${tier}`);
        console.log(`   Code: ${test.code}`);
        failed++;
    }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

// Test actual execution for Tier 1
console.log('🧪 Testing Tier 1 Execution...\n');

try {
    const result = await executeCode('2 + 2 * 10');
    console.log('Code: 2 + 2 * 10');
    console.log('Result:', result);
    console.log('');
} catch (error) {
    console.log('Error:', error.message);
    console.log('');
}

// Test DOM execution
console.log('🧪 Testing Tier 2 Execution (DOM)...\n');

try {
    const result = await executeCode('document.title = "Test";');
    console.log('Code: document.title = "Test";');
    console.log('Result:', result);
    console.log('');
} catch (error) {
    console.log('Error:', error.message);
    console.log('');
}

// Test Tier 3 (should require approval)
console.log('🧪 Testing Tier 3 Detection (should require approval)...\n');

try {
    const result = await executeCode('require("fs").readFileSync("/etc/passwd");');
    console.log('Code: require("fs").readFileSync("/etc/passwd");');
    console.log('Result:', result);
    if (result.error === 'TIER_3_REQUIRES_APPROVAL') {
        console.log('✅ Correctly blocked Tier 3 code!');
    }
    console.log('');
} catch (error) {
    console.log('Error:', error.message);
    console.log('');
}

console.log('✅ All tests completed!\n');

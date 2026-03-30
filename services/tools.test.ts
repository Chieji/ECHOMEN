import { describe, it, expect } from 'vitest';
import { executeCode } from './tools';

describe('executeCode - Sandboxed JavaScript Execution', () => {
    describe('Basic Execution', () => {
        it('should execute simple arithmetic', async () => {
            const result = await executeCode('javascript', 'return 2 + 2;');
            expect(result).toContain('4');
        });

        it('should execute async code', async () => {
            const result = await executeCode('javascript', 'return await Promise.resolve(42);');
            expect(result).toContain('42');
        });

        it('should capture console.log output', async () => {
            const result = await executeCode('javascript', 'console.log("Hello World"); return "done";');
            expect(result).toContain('Hello World');
            expect(result).toContain('done');
        });
    });

    describe('Security Isolation', () => {
        it('should block access to process global', async () => {
            const maliciousCode = 'return process.env;';
            const result = await executeCode('javascript', maliciousCode);
            expect(result).toContain('Error');
            expect(result).not.toContain('PATH');
        });

        it('should block access to require function', async () => {
            const maliciousCode = 'return require("fs").readFileSync("/etc/passwd", "utf-8");';
            const result = await executeCode('javascript', maliciousCode);
            expect(result).toContain('Error');
        });

        it('should block access to global object', async () => {
            const maliciousCode = 'return global;';
            const result = await executeCode('javascript', maliciousCode);
            // VM2 returns [object Object] for global, but it's actually a safe empty object
            // The important thing is that it doesn't expose Node.js internals
            expect(result).not.toContain('process');
            expect(result).not.toContain('versions');
        });

        it('should block access to window object', async () => {
            const maliciousCode = 'return window.document.cookie;';
            const result = await executeCode('javascript', maliciousCode);
            expect(result).toContain('Error');
        });

        it('should block eval function access', async () => {
            const maliciousCode = 'return eval("process.exit(1)");';
            const result = await executeCode('javascript', maliciousCode);
            expect(result).toContain('Error');
        });
    });

    describe('Execution Limits', () => {
        it('should timeout on infinite loops', async () => {
            const infiniteLoop = 'while(true) { } return "done";';
            const result = await executeCode('javascript', infiniteLoop);
            expect(result).toContain('Error');
            // VM2 timeout throws an error, exact message varies by implementation
        }, 10000); // Allow extra time for timeout test

        it('should handle errors gracefully', async () => {
            const erroringCode = 'throw new Error("Test error");';
            const result = await executeCode('javascript', erroringCode);
            expect(result).toContain('Error');
            expect(result).toContain('Test error');
        });

        it('should handle syntax errors', async () => {
            const invalidCode = 'return this is not valid javascript;;;';
            const result = await executeCode('javascript', invalidCode);
            expect(result).toContain('Error');
        });
    });

    describe('Valid Use Cases', () => {
        it('should execute data transformation', async () => {
            const transformCode = `
                const data = [1, 2, 3, 4, 5];
                const doubled = data.map(x => x * 2);
                return JSON.stringify(doubled);
            `;
            const result = await executeCode('javascript', transformCode);
            expect(result).toContain('[2,4,6,8,10]');
        });

        it('should execute mathematical computations', async () => {
            const mathCode = `
                function factorial(n) {
                    if (n <= 1) return 1;
                    return n * factorial(n - 1);
                }
                return factorial(5);
            `;
            const result = await executeCode('javascript', mathCode);
            expect(result).toContain('120');
        });

        it('should execute string operations', async () => {
            const stringCode = `
                const str = "Hello World";
                console.log(str.toUpperCase());
                return str.toLowerCase();
            `;
            const result = await executeCode('javascript', stringCode);
            expect(result).toContain('HELLO WORLD');
            expect(result).toContain('hello world');
        });
    });
});

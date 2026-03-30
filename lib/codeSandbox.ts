/**
 * Code Sandbox - 3-Tier Security Model
 * 
 * Tier 1: Pure Computation (Web Worker) - Auto-execute
 * Tier 2: DOM Sandbox (iframe) - Auto-execute  
 * Tier 3: Full Execution (Backend) - Requires user approval
 */

export type SandboxTier = 'pure' | 'dom' | 'full';

export interface SandboxResult {
    success: boolean;
    output?: string;
    error?: string;
    tier: SandboxTier;
    detectedOperations?: string[];
}

/**
 * Detect code risk level and return tier + detected operations
 */
export function detectCodeTier(code: string): { tier: SandboxTier; operations: string[] } {
    const lowerCode = code.toLowerCase();
    const operations: string[] = [];
    
    // Tier 3: Full execution - requires backend
    const fullExecutionPatterns = [
        { pattern: /\brequire\s*\(/, name: 'Node.js require' },
        { pattern: /\bimport\s+.*\s+from\s+/, name: 'ES6 imports' },
        { pattern: /\bfs\./, name: 'File system (fs)' },
        { pattern: /\bchild_process\b/, name: 'Child process' },
        { pattern: /\bexec\b/, name: 'exec calls' },
        { pattern: /\bspawn\b/, name: 'spawn calls' },
        { pattern: /\bhttp\b\./, name: 'HTTP server' },
        { pattern: /\bnet\b\./, name: 'Network (net)' },
        { pattern: /\bprocess\./, name: 'Process access' },
        { pattern: /\b__dirname\b/, name: 'Node globals' },
        { pattern: /\b__filename\b/, name: 'Node globals' },
        { pattern: /\bmodule\./, name: 'Module system' },
        { pattern: /\bglobal\./, name: 'Global object' },
        { pattern: /\bBuffer\b/, name: 'Buffer access' },
        { pattern: /\bfetch\s*\(/, name: 'Network requests' },
        { pattern: /\bXMLHttpRequest\b/, name: 'XHR requests' },
        { pattern: /\bWebSocket\b/, name: 'WebSocket' },
    ];
    
    for (const { pattern, name } of fullExecutionPatterns) {
        if (pattern.test(code)) {
            operations.push(name);
        }
    }
    
    if (operations.length > 0) {
        return { tier: 'full', operations };
    }
    
    // Tier 2: DOM access
    const domPatterns = [
        { pattern: /\bdocument\./, name: 'DOM access' },
        { pattern: /\bwindow\./, name: 'Window object' },
        { pattern: /\bDOM\b/, name: 'DOM manipulation' },
        { pattern: /\bgetElementById\b/, name: 'DOM query' },
        { pattern: /\bquerySelector\b/, name: 'DOM query' },
        { pattern: /\binnerHTML\b/, name: 'innerHTML' },
        { pattern: /\bcreateElement\b/, name: 'DOM creation' },
        { pattern: /\baddEventListener\b/, name: 'Event listeners' },
    ];
    
    for (const { pattern, name } of domPatterns) {
        if (pattern.test(code)) {
            operations.push(name);
        }
    }
    
    if (operations.length > 0) {
        return { tier: 'dom', operations };
    }
    
    // Tier 1: Pure computation (default)
    return { tier: 'pure', operations: ['Pure computation'] };
}

/**
 * Tier 1: Execute in Web Worker (pure computation only)
 * No DOM, no network, no localStorage access
 */
export async function executeInWorker(code: string, timeoutMs: number = 3000): Promise<SandboxResult> {
    return new Promise((resolve) => {
        const workerBlob = new Blob([`
            self.onmessage = function(e) {
                try {
                    // Capture console output
                    const logs: string[] = [];
                    const originalLog = console.log;
                    const originalError = console.error;
                    const originalWarn = console.warn;
                    
                    console.log = (...args: any[]) => logs.push(args.join(' '));
                    console.error = (...args: any[]) => logs.push('[ERROR] ' + args.join(' '));
                    console.warn = (...args: any[]) => logs.push('[WARN] ' + args.join(' '));
                    
                    // Execute user code
                    const result = (function() {
                        ${code}
                    })();
                    
                    // Restore console
                    console.log = originalLog;
                    console.error = originalError;
                    console.warn = originalWarn;
                    
                    self.postMessage({
                        success: true,
                        output: logs.join('\\n') + (result !== undefined ? '\\nResult: ' + JSON.stringify(result) : ''),
                        tier: 'pure'
                    });
                } catch (error: any) {
                    self.postMessage({
                        success: false,
                        error: error.message,
                        tier: 'pure'
                    });
                }
            };
        `], { type: 'application/javascript' });
        
        const worker = new Worker(URL.createObjectURL(workerBlob));
        
        const timeout = setTimeout(() => {
            worker.terminate();
            resolve({
                success: false,
                error: 'Execution timeout (3s exceeded)',
                tier: 'pure'
            });
        }, timeoutMs);
        
        worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            resolve(e.data as SandboxResult);
        };
        
        worker.onerror = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            resolve({
                success: false,
                error: `Worker error: ${e.message}`,
                tier: 'pure'
            });
        };
        
        worker.postMessage({});
    });
}

/**
 * Tier 2: Execute in iframe sandbox (DOM access, no network)
 */
export async function executeInIframe(code: string, timeoutMs: number = 5000): Promise<SandboxResult> {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        // SECURITY: Strict sandbox - only allow scripts, no forms/top-navigation
        iframe.sandbox.add('allow-scripts');
        document.body.appendChild(iframe);
        
        const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            resolve({
                success: false,
                error: 'Execution timeout (5s exceeded)',
                tier: 'dom'
            });
        }, timeoutMs);
        
        // Listen for messages from iframe
        const handler = (e: MessageEvent) => {
            if (e.source === iframe.contentWindow) {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                window.removeEventListener('message', handler);
                resolve(e.data as SandboxResult);
            }
        };
        window.addEventListener('message', handler);
        
        // Create sandboxed HTML with blocked APIs
        iframe.srcdoc = `<!DOCTYPE html>
<html>
<head><title>Sandbox</title></head>
<body>
<script>
    // Block dangerous APIs
    const blockedAPIs = ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'cookie'];
    blockedAPIs.forEach(api => {
        Object.defineProperty(window, api, {
            get: () => { throw new Error('${api} is blocked in sandbox'); }
        });
    });
    
    // Capture console
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push('[ERROR] ' + args.join(' '));
    console.warn = (...args) => logs.push('[WARN] ' + args.join(' '));
    
    try {
        const result = (function() {
            ${code}
        })();
        
        parent.postMessage({
            success: true,
            output: logs.join('\\n') + (result !== undefined ? '\\nResult: ' + JSON.stringify(result) : ''),
            tier: 'dom'
        }, '*');
    } catch (error) {
        parent.postMessage({
            success: false,
            error: error.message,
            tier: 'dom'
        }, '*');
    }
</script>
</body>
</html>`;
    });
}

/**
 * Tier 3: Execute on backend (full access, requires user approval)
 */
export async function executeOnBackend(code: string, timeoutMs: number = 30000): Promise<SandboxResult> {
    try {
        // Get CSRF token
        const csrfResponse = await fetch('/api/csrf-token', {
            method: 'GET',
            headers: { 'X-Session-ID': 'echomen-frontend' },
        });
        const { token: csrfToken } = await csrfResponse.json();
        
        // Get API key - static import
        const { getSensitiveItem } = await import('./secureStorage');
        const apiKey = await getSensitiveItem('echo-api-key');
        
        if (!apiKey) {
            return {
                success: false,
                error: 'API key not configured',
                tier: 'full'
            };
        }
        
        const response = await fetch('/execute-tool', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                'Authorization': `Bearer ${apiKey}`,
                'X-Session-ID': 'echomen-frontend'
            },
            body: JSON.stringify({
                tool: 'executeCode',
                args: { language: 'javascript', code }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.error || `Backend error: ${response.statusText}`,
                tier: 'full'
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            output: data.result || JSON.stringify(data),
            tier: 'full'
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            tier: 'full'
        };
    }
}

/**
 * Global approval handler - set by App.tsx
 */
let onTier3Approval: ((code: string, operations: string[]) => Promise<boolean>) | null = null;

export function setTier3ApprovalHandler(
    handler: (code: string, operations: string[]) => Promise<boolean>
): void {
    onTier3Approval = handler;
}

/**
 * Main execution function - auto-selects appropriate tier
 * For Tier 3, shows approval modal if handler is set
 */
export async function executeCode(code: string, autoExecuteTiers: ('pure' | 'dom')[] = ['pure', 'dom']): Promise<SandboxResult> {
    const { tier, operations } = detectCodeTier(code);

    // Tier 1: Pure computation - auto-execute
    if (tier === 'pure' && autoExecuteTiers.includes('pure')) {
        console.log('[CodeSandbox] Executing in Web Worker (Tier 1)');
        const result = await executeInWorker(code);
        return { ...result, detectedOperations: operations };
    }

    // Tier 2: DOM access - auto-execute
    if (tier === 'dom' && autoExecuteTiers.includes('dom')) {
        console.log('[CodeSandbox] Executing in iframe (Tier 2)');
        const result = await executeInIframe(code);
        return { ...result, detectedOperations: operations };
    }

    // Tier 3: Full execution - requires user confirmation
    if (tier === 'full') {
        console.log('[CodeSandbox] Code requires Tier 3 (full execution) - user confirmation needed');
        
        // If approval handler is set, use it
        if (onTier3Approval) {
            const approved = await onTier3Approval(code, operations);
            if (approved) {
                // Execute on backend
                return executeOnBackend(code);
            } else {
                return {
                    success: false,
                    error: 'User rejected code execution',
                    tier: 'full',
                    detectedOperations: operations
                };
            }
        }
        
        // No handler - return approval required
        return {
            success: false,
            error: 'TIER_3_REQUIRES_APPROVAL',
            tier: 'full',
            detectedOperations: operations
        };
    }

    // Fallback
    return {
        success: false,
        error: 'Unknown execution tier',
        tier: 'pure'
    };
}

/**
 * Execute with explicit tier selection
 */
export async function executeCodeWithTier(code: string, tier: SandboxTier): Promise<SandboxResult> {
    switch (tier) {
        case 'pure':
            return executeInWorker(code);
        case 'dom':
            return executeInIframe(code);
        case 'full':
            return executeOnBackend(code);
        default:
            return { success: false, error: 'Invalid tier', tier: 'pure' };
    }
}

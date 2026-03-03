const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { chromium } = require('playwright');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// --- Isolated Browser Context Management (Task-Level Isolation) ---
// Each task gets its own browser context to prevent data leakage between parallel tasks.
// The browser instance is shared (singleton), but contexts and pages are task-specific.

let browser = null;
const taskContexts = new Map(); // taskId -> { context, page, createdAt }

/**
 * Gets or creates an isolated browser context for a specific taskId.
 * This ensures parallel tasks within the same session cannot interfere with each other.
 * @param {string} taskId - Unique identifier for the task (e.g., "session123_task456")
 * @returns {Promise<import('playwright').Page>} - The page instance for this task
 */
const getTaskPage = async (taskId = 'default') => {
    if (!browser) {
        console.log('[ECHO Engine] Launching browser instance...');
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Container safety
        });
    }

    if (!taskContexts.has(taskId)) {
        console.log(`[ECHO Engine] Creating isolated context for task: ${taskId}`);
        try {
            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Additional isolation settings
                ignoreHTTPSErrors: false,
                javaScriptEnabled: true
            });
            const page = await context.newPage();
            taskContexts.set(taskId, { 
                context, 
                page, 
                createdAt: Date.now() 
            });
        } catch (error) {
            console.error(`[ECHO Engine] Failed to create context for task ${taskId}:`, error.message);
            throw new Error(`Browser context creation failed: ${error.message}`);
        }
    }

    return taskContexts.get(taskId).page;
};

/**
 * Closes and cleans up a specific task's browser context.
 * This should be called after each task completes to prevent memory leaks.
 * @param {string} taskId - The task identifier to cleanup
 * @returns {Promise<void>}
 */
const closeTaskContext = async (taskId) => {
    if (taskContexts.has(taskId)) {
        const { context } = taskContexts.get(taskId);
        try {
            await context.close();
            taskContexts.delete(taskId);
            console.log(`[ECHO Engine] Purged context for task: ${taskId}`);
        } catch (error) {
            console.error(`[ECHO Engine] Error closing context for task ${taskId}:`, error.message);
            // Still delete from map to prevent stale references
            taskContexts.delete(taskId);
        }
    }
};

/**
 * Cleans up all active task contexts (e.g., on shutdown or session end).
 * @returns {Promise<void>}
 */
const cleanupAllTaskContexts = async () => {
    const taskIds = Array.from(taskContexts.keys());
    console.log(`[ECHO Engine] Cleaning up ${taskIds.length} active task context(s)...`);
    
    for (const taskId of taskIds) {
        await closeTaskContext(taskId);
    }
    
    if (browser) {
        await browser.close();
        browser = null;
        console.log('[ECHO Engine] Browser instance closed.');
    }
};

/**
 * Legacy wrapper for backward compatibility - maps sessionId to a unique taskId.
 * @deprecated Use getTaskPage with explicit taskId instead
 */
const getSessionPage = async (sessionId = 'default') => {
    const taskId = `${sessionId}_legacy_${Date.now()}`;
    return getTaskPage(taskId);
};

/**
 * Legacy wrapper for backward compatibility.
 * @deprecated Use closeTaskContext with explicit taskId instead
 */
const closeSession = async (sessionId) => {
    // Find and close all contexts matching this sessionId prefix
    const taskIdsToClose = [];
    for (const taskId of taskContexts.keys()) {
        if (taskId.startsWith(sessionId)) {
            taskIdsToClose.push(taskId);
        }
    }
    for (const taskId of taskIdsToClose) {
        await closeTaskContext(taskId);
    }
};

/**
 * Executes a shell command with hardened sanitization.
 * 
 * SECURITY NOTE: This function uses allowlist-based validation.
 * Only simple, single commands without shell operators are permitted.
 * For production, consider using execFile with explicit arguments
 * or a containerized execution environment.
 */
const executeShellCommand = (command) => {
    // Reject empty or non-string input
    if (typeof command !== 'string' || !command.trim()) {
        return Promise.reject(new Error("Security Violation: Invalid command input"));
    }
    
    const sanitizedCommand = command.trim();
    
    // Blocklist: reject dangerous characters and patterns
    // This prevents command injection, chaining, and path traversal
    const isDangerous = /[\x00-\x1F\x7F]|(;|\&\&|\|\||\||>|<|\!|\$|\(|\)|\{|\}|\[|\]|\*|\?|~|`|\\)/.test(sanitizedCommand);
    if (isDangerous || sanitizedCommand.includes('..')) {
        console.warn(`[Security] Blocked dangerous command: ${sanitizedCommand}`);
        return Promise.reject(new Error("Security Violation: Command contains restricted characters or traversal."));
    }
    
    // Allowlist: only permit simple alphanumeric commands with basic args
    // Pattern: command followed by optional space-separated arguments
    const allowedPattern = /^[a-zA-Z0-9_./:-]+(\s+[a-zA-Z0-9_./:@%+-]+)*$/;
    if (!allowedPattern.test(sanitizedCommand)) {
        console.warn(`[Security] Blocked non-allowed command: ${sanitizedCommand}`);
        return Promise.reject(new Error("Security Violation: Command format not allowed."));
    }
    
    // Additional check: block known dangerous commands
    const dangerousCommands = ['rm', 'sudo', 'su', 'chmod', 'chown', 'curl', 'wget', 'nc', 'netcat'];
    const baseCommand = sanitizedCommand.split(/\s+/)[0].toLowerCase();
    if (dangerousCommands.includes(baseCommand)) {
        console.warn(`[Security] Blocked dangerous command: ${baseCommand}`);
        return Promise.reject(new Error(`Security Violation: '${baseCommand}' is not permitted.`));
    }
    
    return new Promise((resolve, reject) => {
        exec(sanitizedCommand, { 
            timeout: 60000, 
            maxBuffer: 1024 * 1024,
            shell: '/bin/sh' // Use minimal shell
        }, (error, stdout, stderr) => {
            if (error) { 
                console.error(`[Command Error] ${sanitizedCommand}: ${stderr || error.message}`);
                reject(new Error(stderr || error.message)); 
                return; 
            }
            resolve(stdout);
        });
    });
};

// --- Agentic Browser Actions (WebHawk 2.0 - Task Isolated) ---
// All browser actions now use taskId for complete isolation between parallel tasks.

const browserActions = {
    /**
     * Navigate to a URL within the task's isolated browser context.
     * @param {string} taskId - Unique task identifier
     * @param {string} url - URL to navigate to
     */
    navigate: async (taskId, url) => {
        const page = await getTaskPage(taskId);
        console.log(`[WebHawk] [Task: ${taskId}] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { status: 'success', title: await page.title(), url: page.url() };
    },
    /**
     * Capture a screenshot within the task's isolated browser context.
     * @param {string} taskId - Unique task identifier
     */
    screenshot: async (taskId) => {
        const page = await getTaskPage(taskId);
        const buffer = await page.screenshot({ fullPage: false });
        return { status: 'success', screenshot: buffer.toString('base64') };
    },
    /**
     * Click an element within the task's isolated browser context.
     * @param {string} taskId - Unique task identifier
     * @param {string} selector - CSS selector to click
     */
    click: async (taskId, selector) => {
        const page = await getTaskPage(taskId);
        console.log(`[WebHawk] [Task: ${taskId}] Clicking: ${selector}`);
        await page.click(selector, { timeout: 5000 });
        return { status: 'success', message: `Clicked ${selector}` };
    },
    /**
     * Type text into an element within the task's isolated browser context.
     * @param {string} taskId - Unique task identifier
     * @param {string} selector - CSS selector to type into
     * @param {string} text - Text to type
     * @param {boolean} pressEnter - Whether to press Enter after typing
     */
    type: async (taskId, selector, text, pressEnter = false) => {
        const page = await getTaskPage(taskId);
        console.log(`[WebHawk] [Task: ${taskId}] Typing into ${selector}`);
        await page.fill(selector, text, { timeout: 5000 });
        if (pressEnter) await page.keyboard.press('Enter');
        return { status: 'success', message: `Typed into ${selector}` };
    },
    /**
     * Get accessibility tree within the task's isolated browser context.
     * @param {string} taskId - Unique task identifier
     */
    get_ax_tree: async (taskId) => {
        const page = await getTaskPage(taskId);
        const snapshot = await page.accessibility.snapshot();
        return { status: 'success', axTree: snapshot };
    }
};

// --- GitHub Tools ---

const githubTools = {
    create_repo: async (args) => {
        const { name, description, is_private } = args;
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }
        
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description: description || '',
                private: is_private || false,
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    },
    
    get_pr_details: async (args) => {
        const { owner, repo, prNumber } = args;
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    },
    
    post_pr_comment: async (args) => {
        const { owner, repo, prNumber, body } = args;
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    },
    
    merge_pr: async (args) => {
        const { owner, repo, prNumber, merge_method = 'merge' } = args;
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ merge_method }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    },
    
    create_file_in_repo: async (args) => {
        const { owner, repo, path: filePath, content, message, branch = 'main' } = args;
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }
        
        // Encode content to base64
        const encodedContent = Buffer.from(content).toString('base64');
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                content: encodedContent,
                branch,
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    }
};

// --- Data Analysis Tools ---

const dataTools = {
    analyze: async (args) => {
        const { input_file_path, analysis_script } = args;
        
        try {
            const content = await fs.readFile(path.resolve(input_file_path), 'utf-8');
            const fileExt = path.extname(input_file_path).toLowerCase();
            
            let parsedData;
            if (fileExt === '.json') {
                parsedData = JSON.parse(content);
            } else if (fileExt === '.csv') {
                // Simple CSV parsing
                const lines = content.trim().split('\n');
                const headers = lines[0].split(',');
                parsedData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header.trim()] = values[i]?.trim();
                    });
                    return obj;
                });
            } else {
                parsedData = content;
            }
            
            // Execute analysis script if provided
            if (analysis_script) {
                try {
                    const result = await eval(`(async (data) => { ${analysis_script} })(parsedData)`);
                    return { 
                        status: 'success', 
                        analysis_result: result,
                        data_sample: JSON.stringify(parsedData).substring(0, 1000)
                    };
                } catch (scriptError) {
                    return {
                        status: 'success',
                        error_in_script: scriptError.message,
                        data_sample: JSON.stringify(parsedData).substring(0, 1000)
                    };
                }
            }
            
            return { 
                status: 'success', 
                file_type: fileExt,
                record_count: Array.isArray(parsedData) ? parsedData.length : 'N/A',
                data_sample: JSON.stringify(parsedData).substring(0, 1000)
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },
    
    visualize: async (args) => {
        const { input_file_path, chart_type = 'bar' } = args;
        
        try {
            const content = await fs.readFile(path.resolve(input_file_path), 'utf-8');
            const fileExt = path.extname(input_file_path).toLowerCase();
            
            let parsedData;
            if (fileExt === '.json') {
                parsedData = JSON.parse(content);
            } else if (fileExt === '.csv') {
                const lines = content.trim().split('\n');
                const headers = lines[0].split(',');
                parsedData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header.trim()] = values[i]?.trim();
                    });
                    return obj;
                });
            }
            
            // Generate SVG visualization placeholder
            const svgWidth = 400;
            const svgHeight = 300;
            const svg = `
                <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#f8f9fa"/>
                    <text x="${svgWidth/2}" y="30" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
                        ${chart_type.toUpperCase()} Chart - ${path.basename(input_file_path)}
                    </text>
                    <text x="${svgWidth/2}" y="${svgHeight/2}" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">
                        Data points: ${Array.isArray(parsedData) ? parsedData.length : 'N/A'}
                    </text>
                    <text x="${svgWidth/2}" y="${svgHeight/2 + 30}" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">
                        (Full visualization requires charting library)
                    </text>
                </svg>
            `;
            
            return { 
                status: 'success', 
                chart_type,
                svg_content: svg,
                image_path: 'placeholder.png',
                data_points: Array.isArray(parsedData) ? parsedData.length : 0
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
};

// --- Main Execution Endpoint ---

app.post('/execute-tool', async (req, res) => {
    const { tool, args, sessionId = 'default', taskId, ephemeral = true } = req.body;
    if (!tool) return res.status(400).json({ error: 'Missing tool name' });

    // Generate taskId if not provided (for backward compatibility with sessionId)
    // Format: sessionId_timestamp_randomId ensures uniqueness for parallel tasks
    const effectiveTaskId = taskId || `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[ECHO Engine] Executing: ${tool} (Task: ${effectiveTaskId}, Session: ${sessionId})`);

    try {
        let result;
        switch (tool) {
            case 'readFile':
                result = await fs.readFile(path.resolve(args.path), 'utf8');
                break;
            case 'writeFile':
                const dir = path.dirname(path.resolve(args.path));
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(path.resolve(args.path), args.content, 'utf8');
                result = `File written successfully: ${args.path}`;
                break;
            case 'listFiles':
                result = await fs.readdir(path.resolve(args.path));
                break;
            case 'executeShellCommand':
                result = await executeShellCommand(args.command);
                break;

            // WebHawk 2.0 (Task Isolated)
            case 'browser_navigate':
                result = await browserActions.navigate(effectiveTaskId, args.url);
                break;
            case 'browser_screenshot':
                result = await browserActions.screenshot(effectiveTaskId);
                break;
            case 'browser_click':
                result = await browserActions.click(effectiveTaskId, args.selector);
                break;
            case 'browser_type':
                result = await browserActions.type(effectiveTaskId, args.selector, args.text, args.pressEnter);
                break;
            case 'browser_get_ax_tree':
                result = await browserActions.get_ax_tree(effectiveTaskId);
                break;
            case 'browser_close_session':
                // Close all contexts for this session (legacy) or specific task
                if (taskId) {
                    await closeTaskContext(effectiveTaskId);
                } else {
                    await closeSession(sessionId);
                }
                result = { status: 'success', message: `Context(s) for ${sessionId} closed` };
                break;
            case 'browser_cleanup_task':
                // Explicit task cleanup (ephemeral mode)
                await closeTaskContext(effectiveTaskId);
                result = { status: 'success', message: `Task ${effectiveTaskId} cleaned up` };
                break;

            // GitHub Tools
            case 'github_create_repo':
                result = await githubTools.create_repo(args);
                break;
            case 'github_get_pr_details':
                result = await githubTools.get_pr_details(args);
                break;
            case 'github_post_pr_comment':
                result = await githubTools.post_pr_comment(args);
                break;
            case 'github_merge_pr':
                result = await githubTools.merge_pr(args);
                break;
            case 'github_create_file_in_repo':
                result = await githubTools.create_file_in_repo(args);
                break;

            // Data Analysis Tools
            case 'data_analyze':
                result = await dataTools.analyze(args);
                break;
            case 'data_visualize':
                result = await dataTools.visualize(args);
                break;

            default:
                throw new Error(`Tool '${tool}' is not implemented.`);
        }
        
        // Ephemeral cleanup: automatically clean up browser context after task completion
        // This prevents memory leaks and ensures fresh contexts for each task
        if (ephemeral && tool.startsWith('browser_') && tool !== 'browser_close_session' && tool !== 'browser_cleanup_task') {
            await closeTaskContext(effectiveTaskId);
            console.log(`[ECHO Engine] Ephemeral cleanup completed for task: ${effectiveTaskId}`);
        }
        
        res.json({ result });
    } catch (error) {
        console.error(`[ECHO Engine Error] ${tool}:`, error.message);
        // Ensure cleanup even on error
        if (tool.startsWith('browser_')) {
            await closeTaskContext(effectiveTaskId).catch(() => {});
        }
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ECHO Unified Tool Gateway running on http://localhost:${PORT}`);
    console.log(`WebHawk 2.0 Context Isolation: ACTIVE (Task-Level)`);
    console.log(`GitHub Tools: ${process.env.GITHUB_TOKEN ? 'ENABLED' : 'DISABLED (no token)'}`);
});

// --- Graceful Shutdown Handler ---
// Ensures all browser contexts are properly cleaned up on server shutdown

const gracefulShutdown = async (signal) => {
    console.log(`\n[ECHO Engine] Received ${signal}. Initiating graceful shutdown...`);
    try {
        await cleanupAllTaskContexts();
        console.log('[ECHO Engine] All browser contexts closed. Shutdown complete.');
        process.exit(0);
    } catch (error) {
        console.error('[ECHO Engine] Error during shutdown:', error.message);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Cleanup on uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('[ECHO Engine] Uncaught Exception:', error);
    await cleanupAllTaskContexts().catch(() => {});
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('[ECHO Engine] Unhandled Rejection at:', promise, 'reason:', reason);
    await cleanupAllTaskContexts().catch(() => {});
    process.exit(1);
});

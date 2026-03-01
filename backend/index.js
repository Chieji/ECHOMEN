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

// --- Isolated Browser Context Management ---
let browser = null;
const activeContexts = new Map(); // sessionId -> { context, page }

/**
 * Retrieves or creates an isolated browser context for a specific session.
 */
const getSessionPage = async (sessionId = 'default') => {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }

    if (!activeContexts.has(sessionId)) {
        console.log(`[ECHO Engine] Creating isolated context for session: ${sessionId}`);
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        activeContexts.set(sessionId, { context, page });
    }

    return activeContexts.get(sessionId).page;
};

/**
 * Closes and cleans up a session context.
 */
const closeSession = async (sessionId) => {
    if (activeContexts.has(sessionId)) {
        const { context } = activeContexts.get(sessionId);
        await context.close();
        activeContexts.delete(sessionId);
        console.log(`[ECHO Engine] Purged context for session: ${sessionId}`);
    }
};

/**
 * Executes a shell command with hardened sanitization.
 */
const executeShellCommand = (command) => {
    const sanitizedCommand = command.trim();
    const isDangerous = /[\x00-\x1F\x7F]|(;|\&\&|\|\||\||>|<|\!|\$|\(|\)|\{|\}|\[|\]|\*|\?|~|`|\\)/.test(sanitizedCommand);
    if (isDangerous || sanitizedCommand.includes('..')) {
        return Promise.reject(new Error("Security Violation: Command contains restricted characters or traversal."));
    }
    return new Promise((resolve, reject) => {
        exec(sanitizedCommand, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) { reject(new Error(stderr || error.message)); return; }
            resolve(stdout);
        });
    });
};

// --- Agentic Browser Actions (WebHawk 2.0) ---

const browserActions = {
    navigate: async (sessionId, url) => {
        const page = await getSessionPage(sessionId);
        console.log(`[WebHawk] [Session: ${sessionId}] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { status: 'success', title: await page.title(), url: page.url() };
    },
    screenshot: async (sessionId) => {
        const page = await getSessionPage(sessionId);
        const buffer = await page.screenshot({ fullPage: false });
        return { status: 'success', screenshot: buffer.toString('base64') };
    },
    click: async (sessionId, selector) => {
        const page = await getSessionPage(sessionId);
        console.log(`[WebHawk] [Session: ${sessionId}] Clicking: ${selector}`);
        await page.click(selector, { timeout: 5000 });
        return { status: 'success', message: `Clicked ${selector}` };
    },
    type: async (sessionId, selector, text, pressEnter = false) => {
        const page = await getSessionPage(sessionId);
        console.log(`[WebHawk] [Session: ${sessionId}] Typing into ${selector}`);
        await page.fill(selector, text, { timeout: 5000 });
        if (pressEnter) await page.keyboard.press('Enter');
        return { status: 'success', message: `Typed into ${selector}` };
    },
    get_ax_tree: async (sessionId) => {
        const page = await getSessionPage(sessionId);
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
    const { tool, args, sessionId = 'default' } = req.body;
    if (!tool) return res.status(400).json({ error: 'Missing tool name' });

    console.log(`[ECHO Engine] Executing: ${tool} (Session: ${sessionId})`);

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

            // WebHawk 2.0 (Isolated)
            case 'browser_navigate':
                result = await browserActions.navigate(sessionId, args.url);
                break;
            case 'browser_screenshot':
                result = await browserActions.screenshot(sessionId);
                break;
            case 'browser_click':
                result = await browserActions.click(sessionId, args.selector);
                break;
            case 'browser_type':
                result = await browserActions.type(sessionId, args.selector, args.text, args.pressEnter);
                break;
            case 'browser_get_ax_tree':
                result = await browserActions.get_ax_tree(sessionId);
                break;
            case 'browser_close_session':
                await closeSession(sessionId);
                result = { status: 'success', message: `Session ${sessionId} closed` };
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
        res.json({ result });
    } catch (error) {
        console.error(`[ECHO Engine Error] ${tool}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ECHO Unified Tool Gateway running on http://localhost:${PORT}`);
    console.log(`WebHawk 2.0 Context Isolation: ACTIVE`);
    console.log(`GitHub Tools: ${process.env.GITHUB_TOKEN ? 'ENABLED' : 'DISABLED (no token)'}`);
});

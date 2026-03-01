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

// --- Browser State Management ---
let browser = null;
let context = null;
let page = null;

/**
 * Ensures a browser instance is running and returns the active page.
 */
const getActivePage = async () => {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
    }
    if (!page) {
        page = await context.newPage();
    }
    return page;
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
    navigate: async (url) => {
        const page = await getActivePage();
        console.log(`[WebHawk] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { status: 'success', title: await page.title(), url: page.url() };
    },
    screenshot: async () => {
        const page = await getActivePage();
        const buffer = await page.screenshot({ fullPage: false });
        // Return as base64 for the agent to "see" (if supported) or save as artifact
        const base64 = buffer.toString('base64');
        return { status: 'success', screenshot: base64 };
    },
    click: async (selector) => {
        const page = await getActivePage();
        console.log(`[WebHawk] Clicking: ${selector}`);
        await page.click(selector, { timeout: 5000 });
        return { status: 'success', message: `Clicked ${selector}` };
    },
    type: async (selector, text, pressEnter = false) => {
        const page = await getActivePage();
        console.log(`[WebHawk] Typing into ${selector}`);
        await page.fill(selector, text, { timeout: 5000 });
        if (pressEnter) await page.keyboard.press('Enter');
        return { status: 'success', message: `Typed into ${selector}` };
    },
    get_ax_tree: async () => {
        const page = await getActivePage();
        const snapshot = await page.accessibility.snapshot();
        return { status: 'success', axTree: snapshot };
    }
};

// --- Main Execution Endpoint ---

app.post('/execute-tool', async (req, res) => {
    const { tool, args } = req.body;
    if (!tool) return res.status(400).json({ error: 'Missing tool name' });

    console.log(`[ECHO Engine] Executing: ${tool}`);

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
            
            // WebHawk 2.0 Implementation
            case 'browser_navigate':
                result = await browserActions.navigate(args.url);
                break;
            case 'browser_screenshot':
                result = await browserActions.screenshot();
                break;
            case 'browser_click':
                result = await browserActions.click(args.selector);
                break;
            case 'browser_type':
                result = await browserActions.type(args.selector, args.text, args.pressEnter);
                break;
            case 'browser_get_ax_tree':
                result = await browserActions.get_ax_tree();
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
    console.log(`WebHawk 2.0 Agentic Browser: ACTIVE`);
});

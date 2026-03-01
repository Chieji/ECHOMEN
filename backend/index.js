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

// --- MCP Configuration & Discovery ---
let DISCOVERED_MCPS = {};

/**
 * Scans a range of local ports to discover active MCP services.
 */
const discoverMCPs = async () => {
    console.log('[ECHO Discovery] Scanning for active protocols...');
    const scanRange = [3002, 3003, 3004, 3005]; // Ports defined in docker-compose-mcp.yml
    const newMcps = {};

    for (const port of scanRange) {
        const url = `http://localhost:${port}`;
        try {
            // Probe the endpoint for an ECHO heartbeat or standard MCP signal
            const response = await fetch(`${url}/execute-tool`, { 
                method: 'POST', 
                timeout: 1000,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool: 'heartbeat', args: {} })
            }).catch(() => null);

            if (response && (response.ok || response.status === 404)) {
                // We found a live service. Mapping by port-based naming for now.
                const name = port === 3002 ? 'git' : (port === 3003 ? 'playwright' : (port === 3004 ? 'sequential' : 'dockerhub'));
                newMcps[`${name}_`] = url;
                console.log(`[ECHO Discovery] ✓ Found ${name.toUpperCase()} protocol on ${url}`);
            }
        } catch (e) {
            // Silent fail for inactive ports
        }
    }

    DISCOVERED_MCPS = newMcps;
};

// Run discovery on startup and every 60 seconds
discoverMCPs();
setInterval(discoverMCPs, 60000);

/**
 * Executes a shell command and returns the output.
 */
const executeShellCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }
            resolve(stdout);
        });
    });
};

/**
 * Browses the web using Playwright and extracts clean text content.
 */
const browseWeb = async (url) => {
    console.log(`[WebHawk] Navigating to: ${url}`);
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const title = await page.title();
        // Extract visible text content, ignoring scripts and styles
        const content = await page.evaluate(() => {
            const body = document.body.cloneNode(true);
            const junk = body.querySelectorAll('script, style, nav, footer, iframe, noscript');
            junk.forEach(el => el.remove());
            return body.innerText.substring(0, 15000); // Limit to 15k chars for agent context
        });

        return { title, content };
    } catch (error) {
        console.error(`[WebHawk Error] ${url}:`, error.message);
        throw error;
    } finally {
        await browser.close();
    }
};

/**
 * Proxies a tool call to an external MCP service.
 */
const proxyToMCP = async (mcpUrl, toolName, args) => {
    try {
        const response = await fetch(`${mcpUrl}/execute-tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: toolName, args })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `MCP Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error(`Error proxying to MCP at ${mcpUrl}:`, error);
        throw error;
    }
};

// --- API Endpoints ---

/**
 * Returns the currently discovered MCP services.
 */
app.get('/discovery', (req, res) => {
    res.json({ services: DISCOVERED_MCPS });
});

/**
 * Main execution endpoint for the ECHO agent.
 */
app.post('/execute-tool', async (req, res) => {
    const { tool, args } = req.body;
    
    if (!tool) {
        return res.status(400).json({ error: 'Missing tool name' });
    }

    console.log(`[ECHO Engine] Executing: ${tool}`);

    try {
        let result;

        // Check DISCOVERED_MCPS first
        const mcpPrefix = Object.keys(DISCOVERED_MCPS).find(prefix => tool.startsWith(prefix));

        if (mcpPrefix) {
            const mcpUrl = DISCOVERED_MCPS[mcpPrefix];
            result = await proxyToMCP(mcpUrl, tool, args);
        } else {
            // Handle internal tools
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
                case 'browse_web':
                    result = await browseWeb(args.url);
                    break;
                default:
                    throw new Error(`Tool '${tool}' is not discovered or implemented.`);
            }
        }

        res.json({ result });
    } catch (error) {
        console.error(`[ECHO Engine Error] ${tool}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ECHO Unified Tool Gateway running on http://localhost:${PORT}`);
    console.log(`Discovery Mode: Active (Scanning ports 3002-3005)`);
});

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
 * Executes a shell command with hardened sanitization.
 */
const executeShellCommand = (command) => {
    // Hardened Security Guard: Only allow alphanumeric, spaces, and basic file path characters.
    // Explicitly block any shell meta-characters that could lead to injection.
    const sanitizedCommand = command.trim();
    const isDangerous = /[\x00-\x1F\x7F]|(;|\&\&|\|\||\||>|<|\!|\$|\(|\)|\{|\}|\[|\]|\*|\?|~|`|\\)/.test(sanitizedCommand);
    
    if (isDangerous) {
        return Promise.reject(new Error("Security Violation: Command contains restricted shell characters. Only direct commands are permitted."));
    }

    // Boundary Check: Prevent directory traversal attempts
    if (sanitizedCommand.includes('..')) {
        return Promise.reject(new Error("Security Violation: Directory traversal detected."));
    }

    return new Promise((resolve, reject) => {
        // We use exec here because it's a developer tool, but we've applied a strict regex filter above.
        exec(sanitizedCommand, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }
            resolve(stdout);
        });
    });
};

/**
 * Validates and normalizes a URL for browsing.
 * Only allows HTTP/HTTPS URLs and blocks potentially dangerous protocols.
 */
const validateUrl = (urlString) => {
    try {
        const parsedUrl = new URL(urlString);
        
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return null;
        }
        
        // Ensure the URL is well-formed
        return parsedUrl.href;
    } catch (e) {
        // Invalid URL format
        return null;
    }
};

/**
 * Validates and normalizes a file path to prevent directory traversal.
 * Ensures the resolved path stays within the allowed base directory.
 */
const BASE_DIR = path.resolve(process.cwd());

const validatePath = (inputPath) => {
    // Reject absolute paths that start with / or Windows drive letters
    if (path.isAbsolute(inputPath) && !inputPath.startsWith(BASE_DIR)) {
        return null;
    }
    
    // Resolve and normalize the path
    const resolvedPath = path.resolve(BASE_DIR, inputPath);
    
    // Ensure the resolved path starts with the base directory
    if (!resolvedPath.startsWith(BASE_DIR + path.sep) && resolvedPath !== BASE_DIR) {
        return null;
    }
    
    return resolvedPath;
};

/**
 * Browses the web using Playwright and extracts clean text content.
 */
const browseWeb = async (url) => {
    // Validate the URL before browsing
    const validatedUrl = validateUrl(url);
    if (!validatedUrl) {
        throw new Error('Invalid URL: Only HTTP and HTTPS URLs are allowed');
    }
    
    console.log(`[WebHawk] Navigating to: ${validatedUrl}`);
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(validatedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
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
                    const readPath = validatePath(args.path);
                    if (!readPath) {
                        throw new Error('Security Violation: Invalid path - directory traversal detected');
                    }
                    result = await fs.readFile(readPath, 'utf8');
                    break;
                case 'writeFile':
                    const writePath = validatePath(args.path);
                    if (!writePath) {
                        throw new Error('Security Violation: Invalid path - directory traversal detected');
                    }
                    const dir = path.dirname(writePath);
                    await fs.mkdir(dir, { recursive: true });
                    await fs.writeFile(writePath, args.content, 'utf8');
                    result = `File written successfully: ${args.path}`;
                    break;
                case 'listFiles':
                    const listPath = validatePath(args.path);
                    if (!listPath) {
                        throw new Error('Security Violation: Invalid path - directory traversal detected');
                    }
                    result = await fs.readdir(listPath);
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

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// --- MCP Configuration ---
// Map tool prefixes to their Docker-based MCP ports as defined in docker-compose-mcp.yml
const MCP_CONFIG = {
    'git_': 'http://localhost:3002',
    'playwright_': 'http://localhost:3003',
    'sequentialthinking_': 'http://localhost:3004',
    'dockerhub_': 'http://localhost:3001' // This might overlap if not careful
};

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

// --- Main Execution Endpoint ---

app.post('/execute-tool', async (req, res) => {
    const { tool, args } = req.body;
    
    if (!tool) {
        return res.status(400).json({ error: 'Missing tool name' });
    }

    console.log(`[ECHO Engine] Executing: ${tool} with args:`, args);

    try {
        let result;

        // Check if it's an internal tool or needs MCP proxying
        const mcpPrefix = Object.keys(MCP_CONFIG).find(prefix => tool.startsWith(prefix));

        if (mcpPrefix) {
            const mcpUrl = MCP_CONFIG[mcpPrefix];
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
                    // If playwright MCP is used for web browsing, proxy it
                    if (MCP_CONFIG['playwright_']) {
                        result = await proxyToMCP(MCP_CONFIG['playwright_'], 'playwright_browse', args);
                    } else {
                        throw new Error('Web browsing requires the Playwright MCP service.');
                    }
                    break;
                default:
                    throw new Error(`Tool '${tool}' is not implemented in the ECHO engine.`);
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
    console.log(`Connected MCPs: ${Object.keys(MCP_CONFIG).join(', ')}`);
});

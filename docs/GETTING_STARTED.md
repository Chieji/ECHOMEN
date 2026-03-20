# ECHOMEN Getting Started Guide

**Version:** 1.0  
**Last Updated:** 2026-03-20

---

## Welcome to ECHOMEN! 🚀

ECHOMEN is a powerful, multi-provider AI agent workstation that enables seamless automation, tool integration, and human-in-the-loop workflows. This guide will help you get started in minutes.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Basic Concepts](#basic-concepts)
4. [Common Workflows](#common-workflows)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Step 1: Clone the Repository

```bash
git clone https://github.com/Chieji/ECHOMEN.git
cd ECHOMEN
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create a `.env` file in the root directory:

```bash
# API Configuration
ECHO_API_URL=http://localhost:3001
ECHO_API_KEY=your-secret-key-here

# Database (optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echomen
DB_USER=postgres
DB_PASSWORD=password

# AI Providers
OPENAI_API_KEY=sk-your-key-here
GEMINI_API_KEY=your-key-here

# Logging
LOG_LEVEL=info
```

### Step 4: Start the Server

```bash
npm start
```

You should see:

```
✓ ECHOMEN server running on http://localhost:3001
✓ WebSocket server ready on ws://localhost:3001
✓ All plugins loaded successfully
```

---

## Quick Start

### 1. Access the Web Interface

Open your browser and navigate to:

```
http://localhost:3001
```

### 2. Create Your First Session

Click **"New Session"** to start a new workstation session.

### 3. Execute Your First Tool

In the tool selector, choose **GitHub** → **List Repositories**:

```
Owner: Chieji
Type: owner
Limit: 10
```

Click **Execute** and watch the magic happen! 🎉

### 4. View Results

Results appear in the output panel with:
- Execution time
- Status (success/failure)
- Formatted data display

---

## Basic Concepts

### Sessions

A **session** is an isolated workspace where you execute tools and maintain state.

- Each session has its own context
- Sessions are independent of each other
- Sessions can be saved and resumed

### Tools

**Tools** are functions that perform specific actions:

- **GitHub Tools**: Manage repositories, issues, PRs
- **Slack Tools**: Send messages, manage channels
- **HTTP Tools**: Make API requests
- **Custom Tools**: Create your own!

### Workflows

**Workflows** are sequences of tools executed in order:

1. Get GitHub repositories
2. Filter by language
3. Send summary to Slack
4. Log results to database

### Human-in-the-Loop (HITL)

Certain actions require human approval:

- Deleting files
- Running system commands
- Modifying sensitive data

When a tool requires approval, you'll see an approval modal. Review the action and click **Approve** or **Reject**.

---

## Common Workflows

### Workflow 1: GitHub Repository Analysis

**Goal:** Analyze a GitHub repository and create an issue with findings.

**Steps:**

1. **Get Repository Details**
   - Tool: `github:getRepoDetails`
   - Owner: `Chieji`
   - Repo: `Echoctl`

2. **List Pull Requests**
   - Tool: `github:listPullRequests`
   - Owner: `Chieji`
   - Repo: `Echoctl`
   - State: `open`

3. **Create Issue**
   - Tool: `github:createIssue`
   - Title: `Analysis Report`
   - Body: (Use results from previous steps)

### Workflow 2: Slack Notifications

**Goal:** Send a summary to Slack when a workflow completes.

**Steps:**

1. **Execute Main Workflow**
   - (Your workflow here)

2. **Send Message to Slack**
   - Tool: `slack:sendMessage`
   - Channel: `#notifications`
   - Text: (Summary of results)

### Workflow 3: API Data Pipeline

**Goal:** Fetch data from an API, process it, and store results.

**Steps:**

1. **Fetch Data**
   - Tool: `http:get`
   - URL: `https://api.example.com/data`

2. **Process Data**
   - (Custom processing)

3. **Store Results**
   - Tool: `http:post`
   - URL: `https://api.example.com/results`
   - Body: (Processed data)

---

## Configuration

### Setting API Keys

#### GitHub

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **Generate new token**
3. Select scopes: `repo`, `workflow`, `user`
4. Copy the token
5. Set environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

#### Slack

1. Go to [Slack API Dashboard](https://api.slack.com/apps)
2. Create a new app
3. Go to **OAuth & Permissions**
4. Add scopes: `chat:write`, `channels:read`, `users:read`
5. Copy the Bot Token
6. Set environment variable:

```bash
export SLACK_BOT_TOKEN=xoxb_your_token_here
```

#### OpenAI

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key
4. Set environment variable:

```bash
export OPENAI_API_KEY=sk_your_key_here
```

### Adjusting Settings

Edit `~/.echo/config.json`:

```json
{
  "theme": "dark",
  "outputFormat": "json",
  "toolTimeout": 60000,
  "enableHITL": true,
  "logLevel": "debug"
}
```

---

## Troubleshooting

### Issue: "Connection refused"

**Cause:** Server is not running

**Solution:**

```bash
npm start
```

### Issue: "API key not found"

**Cause:** Environment variables not set

**Solution:**

```bash
export GITHUB_TOKEN=your_token
export SLACK_BOT_TOKEN=your_token
export OPENAI_API_KEY=your_key
```

### Issue: "Tool execution timeout"

**Cause:** Tool took too long to execute

**Solution:**

Increase timeout in config:

```json
{
  "toolTimeout": 120000
}
```

### Issue: "Rate limit exceeded"

**Cause:** Too many requests to external API

**Solution:**

Wait a few minutes before retrying, or upgrade your API plan.

### Issue: "Approval timeout"

**Cause:** Took too long to approve action

**Solution:**

Approvals expire after 5 minutes. Re-execute the tool to request a new approval.

---

## Next Steps

### 1. Create Your First Plugin

Learn how to create custom plugins:

→ [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)

### 2. Explore Advanced Features

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Security Guide](./SECURITY.md)

### 3. Join the Community

- [GitHub Discussions](https://github.com/Chieji/ECHOMEN/discussions)
- [Report Issues](https://github.com/Chieji/ECHOMEN/issues)
- [Submit Plugins](https://github.com/Chieji/ECHOMEN/wiki/Plugin-Registry)

---

## Common Questions

### Q: Can I use ECHOMEN offline?

**A:** Most features require internet connectivity for external APIs. However, you can use local tools without internet.

### Q: Is ECHOMEN secure?

**A:** Yes! ECHOMEN implements multiple security layers:
- CSRF protection
- API key authentication
- Human-in-the-loop approval
- Comprehensive audit logging
- Input validation and sanitization

See [Security Guide](./SECURITY.md) for details.

### Q: Can I integrate ECHOMEN with my own tools?

**A:** Yes! Create a custom plugin. See [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md).

### Q: How do I backup my sessions?

**A:** Sessions are automatically saved. You can export them:

```bash
echoctl export-session <session-id> > backup.json
```

### Q: What's the difference between ECHOMEN and Echoctl?

**ECHOMEN** is the web-based workstation with a UI.
**Echoctl** is the CLI tool for command-line usage.

Both share the same plugin ecosystem and core functionality.

---

## Tips & Tricks

### 💡 Tip 1: Use Templates

Save frequently used workflows as templates for quick reuse.

### 💡 Tip 2: Chain Tools

Use output from one tool as input to the next tool.

### 💡 Tip 3: Monitor Performance

Check the performance dashboard to identify slow tools.

### 💡 Tip 4: Enable Debug Logging

Set `LOG_LEVEL=debug` to see detailed execution logs.

### 💡 Tip 5: Use Keyboard Shortcuts

- `Ctrl+K`: Quick tool search
- `Ctrl+Enter`: Execute tool
- `Ctrl+S`: Save session

---

## Support

Need help? Here are your options:

1. **Documentation**: Check the [docs](https://github.com/Chieji/ECHOMEN/tree/main/docs)
2. **GitHub Issues**: [Report a bug](https://github.com/Chieji/ECHOMEN/issues)
3. **Discussions**: [Ask a question](https://github.com/Chieji/ECHOMEN/discussions)
4. **Email**: support@echomen.dev

---

**Happy automating! 🎉**

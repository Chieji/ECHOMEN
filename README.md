<div align="center">
  <img src="./public/echo-logo.svg" alt="ECHO Logo" width="400" />
  
  <h3>Your Multi-Ecosystem AI Workstation</h3>
  
  <p>
    <a href="https://github.com/chieji/ECHOMEN"><img src="https://img.shields.io/badge/status-production--ready-green" alt="Status" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D18-blue" alt="Node.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb" alt="React" /></a>
    <a href="https://github.com/chieji/ECHOMEN/blob/main/LICENSE"><img src="https://img.shields.io/github/license/chieji/ECHOMEN" alt="License" /></a>
  </p>
  
  <p>
    <a href="https://github.com/chieji/echoctl"><strong>CLI Repo »</strong></a> •
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#security">Security</a>
  </p>
</div>

---

## 🚀 What is ECHOMEN?

**ECHOMEN** is a full-stack AI orchestration platform that brings together 14+ AI providers into a single, secure workstation. Think of it as your AI command center — where you can manage multiple AI models, execute complex tasks, and build extensions that work across ecosystems.

### Why ECHOMEN Exists

Most AI tools lock you into a single provider. ECHOMEN breaks those walls:
- ✅ **Multi-Provider**: Switch between Gemini, Claude, GPT-4, Qwen, and 10+ others instantly
- ✅ **Extension System**: Import skills from Claude, Gemini, Qwen, or build your own
- ✅ **Safe Execution**: 3-tier sandbox prevents AI from running dangerous code
- ✅ **Zero-Config APIs**: Free web search, Wikipedia, weather — no API keys needed
- ✅ **MCP Support**: Compatible with Model Context Protocol servers

---

## ✨ Features

### 🧠 AI Orchestration
- **14+ AI Providers**: Google Gemini, OpenAI, Anthropic, Alibaba Qwen, DeepSeek, Kimi, Groq, Ollama, OpenRouter, Together AI, ModelScope, Mistral, Hugging Face, GitHub Models
- **Smart Routing**: Automatically selects the best AI for each task
- **Failover Chain**: If one provider fails, automatically tries the next
- **Token Tracking**: Monitor usage across all providers

### 🔌 Extension Registry
- **Unified System**: MCP servers, plugins, and skills in one place
- **Cross-Ecosystem**: Import Claude skills, Gemini extensions, Qwen plugins
- **Persistence**: Extensions saved and synced across sessions
- **Auth Management**: Secure API key storage for each extension

### 🛡️ 3-Tier Code Sandbox
```
Tier 1 (Pure)  → Web Worker      → Auto-execute ✅
Tier 2 (DOM)   → iframe sandbox  → Auto-execute ✅
Tier 3 (Full)  → Backend         → User approval required 🛑
```

### 🌐 Zero-Config Web APIs
No API keys needed for these tools:
- **Web Search**: DuckDuckGo integration
- **Wikipedia**: Article search and summaries
- **Reddit**: Posts and comments from any subreddit
- **Hacker News**: Top and new stories
- **Weather**: Current conditions via Open-Meteo
- **Archive.org**: Check if URLs are archived
- **Web Scraping**: Extract content from any website

### 🔒 Security Hardening
- ✅ API keys never touch the frontend
- ✅ CSRF protection with fail-loud design
- ✅ Path traversal prevention
- ✅ SSRF protection for web tools
- ✅ Command allowlisting for shell execution
- ✅ XSS prevention in markdown rendering
- ✅ Zod validation for all LLM responses

---

## 📦 Installation

### Option 1: Docker (Recommended for Production)

**Prerequisites:**
- Docker 20+
- Docker Compose 2+

**Quick Start:**

```bash
# Clone the repository
git clone https://github.com/chieji/ECHOMEN.git
cd ECHOMEN

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your favorite editor

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Access:** Navigate to `http://localhost:3000`

**Volumes:**
- `echomen-logs` - Application logs
- `echomen-browser-cache` - Playwright browser cache

---

### Option 2: Manual Installation

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** or **npm**
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/chieji/ECHOMEN.git
cd ECHOMEN
```

### Step 2: Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys
# At minimum, configure one AI provider:
GEMINI_API_KEY=your_gemini_key_here
```

### Step 4: Build the Application

```bash
# Build frontend and backend
npm run build
```

### Step 5: Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

### Step 6: Open in Browser

Navigate to `http://localhost:3000`

---

## 🎯 Usage

### Quick Start

1. **Configure AI Providers**: Go to Settings → AI Providers and add your API keys
2. **Start a Task**: Type a goal like "Build a React component for user profiles"
3. **Watch Execution**: ECHOMEN breaks it into tasks and executes them
4. **Review Results**: Check the Artifacts panel for outputs

### Agent Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Chat** | Conversational AI | Questions, explanations, debugging help |
| **Action** | Task execution | Building, coding, file operations |
| **Plan** | Read-only exploration | Research, codebase analysis |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` / `Cmd+K` | Command Palette |
| `Ctrl+1` | Switch to Action Mode |
| `Ctrl+2` | Switch to Chat Mode |
| `Ctrl+C` | Stop execution |

---

## 🔗 Related Repos

### ECHOMEN Ecosystem

- **[Echoctl CLI](https://github.com/chieji/echoctl)** — Command-line interface for ECHOMEN
  - Terminal-based AI agent
  - Extension management
  - Model switching
  - MCP server integration

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                 ECHOMEN Platform                     │
├─────────────────────────────────────────────────────┤
│  Frontend (React 19)    │  Backend (Express/tRPC)  │
│  - Agent UI             │  - AI Proxy              │
│  - Task Pipeline        │  - Tool Execution        │
│  - Artifact Viewer      │  - Database (MySQL)      │
├─────────────────────────────────────────────────────┤
│              Extension Registry                     │
│  MCP Servers │ Plugins │ Skills (Claude/Gemini)   │
└─────────────────────────────────────────────────────┘
```

---

## 🛡️ Security

ECHOMEN implements enterprise-grade security:

### Frontend Security
- API keys stored in encrypted sessionStorage (AES-GCM)
- No secrets in client bundle
- CSRF tokens for all state-changing requests
- Content Security Policy headers

### Backend Security
- Command allowlisting (no arbitrary shell execution)
- Path traversal prevention
- SSRF protection for web requests
- Rate limiting on all endpoints

### Code Execution
- **Tier 1**: Pure math in Web Workers (safe)
- **Tier 2**: DOM manipulation in sandboxed iframes (isolated)
- **Tier 3**: Full execution requires user approval (audited)

For detailed security information, see [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md) and [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md).

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | AI agent system architecture |
| [TOOLS.md](./TOOLS.md) | Available tools and capabilities |
| [SOUL.md](./SOUL.md) | Design philosophy and principles |
| [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md) | Security model overview |
| [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) | Security audit findings |

---

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Issue reporting

---

## 📊 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Framer Motion** for animations
- **Tailwind CSS** for styling

### Backend
- **Express.js** with tRPC
- **Drizzle ORM** for database
- **MySQL** for persistence
- **Supabase Auth** for authentication

### AI Integration
- Custom multi-provider bridge
- MCP client for external tools
- Zod for schema validation

---

## 📈 Roadmap

### Q2 2026
- [ ] Mobile app (React Native)
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] More MCP server integrations

### Q3 2026
- [ ] Plugin marketplace
- [ ] Team workspaces
- [ ] Advanced RBAC
- [ ] Self-hosting improvements

---

## 🙏 Acknowledgments

Built with inspiration from:
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://claude.ai/code)
- [Continue.dev](https://continue.dev/)

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/chieji">chieji</a></p>
  <p>⭐ Star this repo if you find it useful!</p>
</div>

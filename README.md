# ECHO Platform — Enterprise AI Orchestration

<div align="center">

![ECHO Platform](https://img.shields.io/badge/ECHO-Platform-6366f1?style=for-the-badge)
![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**Your thoughts. My echo. Infinite possibility.**

[![Echoctl](https://img.shields.io/badge/Echoctl-CLI%20Brain-4f46e5?style=for-the-badge&logo=terminal)](https://github.com/Chieji/Echoctl)
[![ECHOMEN](https://img.shields.io/badge/ECHOMEN-Web%20Dashboard-06b6d4?style=for-the-badge&logo=react)](https://github.com/Chieji/ECHOMEN)

</div>

---

## 🎯 What is ECHO?

**ECHO** is a complete AI agent orchestration platform combining two powerful components:

| Component | Description | Repository |
|-----------|-------------|------------|
| **Echoctl** | CLI brain with BDI engine, 14+ AI providers, multi-layer memory | [→ View Echoctl](https://github.com/Chieji/Echoctl) |
| **ECHOMEN** | Web dashboard for visual agent management, real-time monitoring, browser automation | [→ View ECHOMEN](https://github.com/Chieji/ECHOMEN) |

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECHO Platform Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │   ECHOMEN (Web UI)   │◄───────►│   Echoctl (CLI)      │     │
│  │  - Dashboard         │  WebSocket│  - BDI Engine      │     │
│  │  - Agent Management  │  Bridge  │  - 14+ Providers   │     │
│  │  - Browser Automation│          │  - Multi-layer Mem │     │
│  │  - Knowledge Graph   │          │  - Tool Execution  │     │
│  └──────────────────────┘         └──────────────────────┘     │
│           │                                  │                  │
│           ▼                                  ▼                  │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │   PostgreSQL DB      │         │   AI Providers       │     │
│  │   - Agents           │         │   - Groq, Gemini     │     │
│  │   - Knowledge Nodes  │         │   - Together, Cohere │     │
│  │   - Playbooks        │         │   - OpenRouter, etc. │     │
│  │   - Activity Logs    │         │                      │     │
│  └──────────────────────┘         └──────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Platform Features

### 🎛️ Multi-Agent Orchestration
- **Autonomous Execution** - ReAct engine with Planner, Executor, Reviewer agents
- **Parallel Task Execution** - Up to 4 concurrent tasks with dependency management
- **HITL Safety Gates** - Human approval for privileged operations (shell, file write)
- **Real-time Status Streaming** - Live task progress via WebSocket

### 🤖 AI Provider Integration
- **7+ Providers** - Groq, Gemini, Together AI, Cohere, OpenRouter, Mistral, HuggingFace
- **Smart Routing** - Auto-select optimal provider (chat→Groq, code→Together, reasoning→Gemini)
- **Fallback Chain** - Automatic retry with degraded providers on failure
- **Health Monitoring** - Real-time provider status and latency tracking

### 🌐 Browser Automation (WebHawk 2.0)
- **Playwright-based** - Full browser automation with headless Chrome
- **AXTree Navigation** - Accessibility tree parsing for reliable element interaction
- **Persistent Sessions** - Maintain login state across multi-step web tasks
- **Screenshot Capture** - Visual feedback with base64 encoding

### 🧠 Knowledge Graph
- **Wiki-Linking** - `[[Link Title]]` syntax with bidirectional backlinks
- **Playbook Learning** - Auto-extract execution patterns from successful tasks
- **Neural Vault Export** - Portable ZIP archive of entire knowledge base
- **Full-Text Search** - Fast search across notes, artifacts, and conversations

### 💬 AI Chat Interface
- **Streaming Responses** - Token-by-token progressive rendering
- **Persistent History** - All conversations stored and searchable
- **Rich Markdown** - Full formatting, code blocks, syntax highlighting
- **Action/Chat Modes** - Toggle between conversation and execution

### 📊 Code Analysis
- **Multi-Language** - TypeScript, Python, JavaScript, Go, Rust, and more
- **AI-Powered Summaries** - Automatic documentation generation
- **Security Scanning** - Potential vulnerability detection
- **Export Results** - Download in multiple formats

---

## 🚀 Quick Start

### Option 1: Full Platform Install (Recommended)

Install both Echoctl (CLI) and ECHOMEN (Web UI) for complete functionality:

```bash
# 1. Clone both repositories
git clone https://github.com/Chieji/Echoctl.git
git clone https://github.com/Chieji/ECHOMEN.git

# 2. Install Echoctl (CLI Brain)
cd Echoctl
npm install
npm link
echoctl --version  # Verify installation

# 3. Install ECHOMEN (Web Dashboard)
cd ../ECHOMEN
pnpm install
```

### Option 2: Echoctl Only (CLI Mode)

If you only need CLI functionality:

```bash
git clone https://github.com/Chieji/Echoctl.git
cd Echoctl
npm install
npm link
```

### Option 3: ECHOMEN Only (Web UI)

If you want the web dashboard (requires Echoctl running separately):

```bash
git clone https://github.com/Chieji/ECHOMEN.git
cd ECHOMEN
pnpm install
```

---

## 📋 Configuration

### Step 1: Environment Setup

**ECHOMEN** - Copy and configure `.env.local`:

```bash
cd ECHOMEN
cp .env.example .env.local
```

Edit `.env.local`:

```env
# === Supabase Authentication ===
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# === Database ===
DATABASE_URL=postgresql://user:password@localhost:5432/echomen

# === Echoctl WebSocket Bridge ===
ECHOCTL_WS_URL=ws://localhost:8080

# === AI Providers (configure at least one) ===
# Groq (ultra-low latency chat)
GROQ_API_KEY=gsk_xxx

# Google Gemini (complex reasoning, default fallback)
GEMINI_API_KEY=AIzaSy...

# Together AI (code generation specialist)
TOGETHER_API_KEY=xxx

# Cohere (data processing)
COHERE_API_KEY=xxx

# OpenRouter (general purpose fallback)
OPENROUTER_API_KEY=sk-or-xxx

# Mistral (EU compliance, GDPR)
MISTRAL_API_KEY=xxx

# Hugging Face (specialized models)
HUGGINGFACE_API_KEY=hf_xxx
```

### Step 2: Initialize Database

```bash
cd ECHOMEN
pnpm db:push
```

### Step 3: Start Echoctl Server

**In a separate terminal:**

```bash
cd Echoctl
echoctl serve --ws-port 8080
```

Keep this running - ECHOMEN needs it for real-time communication.

### Step 4: Start ECHOMEN Web Server

```bash
cd ECHOMEN
pnpm dev
```

The web dashboard will be available at `http://localhost:3000`.

---

## 🔗 Repository Links

### Cross-Repository Navigation

| From | To | Link |
|------|-----|------|
| **Echoctl** | → ECHOMEN Web UI | [github.com/Chieji/ECHOMEN](https://github.com/Chieji/ECHOMEN) |
| **ECHOMEN** | → Echoctl CLI | [github.com/Chieji/Echoctl](https://github.com/Chieji/Echoctl) |

### Installation Dependencies

```
ECHOMEN requires Echoctl for:
├─ Agent execution engine
├─ AI provider chain
├─ Browser automation (WebHawk)
└─ Tool execution (shell, files, MCP)

Echoctl can run standalone:
└─ Full CLI functionality without ECHOMEN
   └─ ECHOMEN adds: Visual dashboard, real-time monitoring, browser view
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 | Modern UI framework |
| **UI Components** | shadcn/ui, Radix UI | Accessible component library |
| **Backend** | Express 4, tRPC 11, Node.js | Type-safe API layer |
| **Database** | PostgreSQL, Supabase, Drizzle ORM | Data persistence |
| **Real-time** | WebSocket, Server-Sent Events (SSE) | Live updates |
| **AI Bridge** | Groq, Gemini, Together, Cohere, OpenRouter | 7+ provider integration |
| **Browser** | Playwright | Web automation |
| **Deployment** | Docker, Railway, Render, Vercel | Cloud hosting |

### System Components

```
ECHOMEN (Web Dashboard)
├── client/                    # React 19 + TypeScript frontend
│   ├── pages/
│   │   ├── Dashboard.tsx     # Real-time KPIs, activity feed
│   │   ├── Agents.tsx        # Agent CRUD, status monitoring
│   │   ├── Chat.tsx          # AI chat interface
│   │   ├── BrowserView.tsx   # WebHawk browser automation
│   │   └── Settings.tsx      # Configuration, provider management
│   ├── hooks/
│   │   ├── useEchoctl.ts     # Echoctl integration hooks
│   │   └── useAgentStatus.ts # Real-time status streaming
│   └── lib/
│       ├── trpc.ts           # tRPC client
│       └── api.ts            # API wrappers
│
├── server/                    # Express + tRPC backend
│   ├── routers/
│   │   ├── echoctlRouter.ts  # Echoctl WebSocket bridge
│   │   ├── browserRouter.ts  # WebHawk automation API
│   │   └── knowledgeRouter.ts# Knowledge graph API
│   ├── lib/
│   │   ├── agent-executor.ts # Multi-agent orchestration
│   │   ├── ai-provider-chain.ts # 7-provider AI routing
│   │   ├── webhawk.ts        # Browser automation
│   │   └── planner.ts        # Task decomposition
│   └── db.ts                 # Database queries
│
└── drizzle/                   # Database schema & migrations
    └── schema.ts              # Tables: agents, knowledge_nodes, playbooks

Echoctl (CLI Brain)
├── src/                       # Core CLI engine
│   ├── bdi/                   # Belief-Desire-Intention engine
│   ├── providers/             # 14+ AI provider implementations
│   ├── tools/                 # Tool execution (shell, files, MCP)
│   └── memory/                # Multi-layer memory system
└── plugins/                   # Plugin system
```

---

## 🧪 Testing

### Run Test Suites

```bash
# ECHOMEN tests
cd ECHOMEN
pnpm test                    # Run all tests
pnpm test:backend            # Backend only
pnpm test:frontend           # Frontend only
pnpm test:integration        # Integration tests (requires Echoctl running)

# Echoctl tests
cd Echoctl
npm test                     # Run all tests
npm test:unit                # Unit tests
npm test:integration         # Integration tests
```

### Test Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| Echoctl Core | 85% | ✅ Passing |
| ECHOMEN Backend | 78% | ✅ Passing |
| ECHOMEN Frontend | 65% | ✅ Passing |
| Integration Tests | 70% | ✅ Passing |

---

## 📦 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
cd ECHOMEN
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Cloud Platforms

#### Railway (1-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/echo)

#### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=github.com/Chieji/ECHOMEN)

#### Vercel

```bash
cd ECHOMEN
vercel deploy
```

### Environment Variables (Production)

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_KEY=...
ECHOCTL_WS_URL=wss://your-echoctl-instance.com

# AI Providers (at least one)
GROQ_API_KEY=...
GEMINI_API_KEY=...
TOGETHER_API_KEY=...
```

---

## 🔐 Security

### Implemented Security Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Authentication** | ✅ | Supabase Auth with OAuth (Google, GitHub, Discord) |
| **Authorization** | ✅ | Role-based access control (user, admin) |
| **API Security** | ✅ | tRPC with input validation (Zod schemas) |
| **Database Security** | ✅ | Parameterized queries, SQL injection prevention |
| **Browser Isolation** | ✅ | Headless Chrome in sandboxed mode |
| **HITL Gates** | ✅ | Human approval for privileged operations |
| **Provider Fallback** | ✅ | Automatic retry with degraded providers |

### Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Rotate API keys regularly** - Especially for AI providers
3. **Use HTTPS in production** - Required for WebSocket connections
4. **Enable rate limiting** - Prevent abuse of AI endpoints
5. **Monitor activity logs** - Track all agent executions

---

## 📚 Documentation

### Getting Started Guides

- [Echoctl CLI Quickstart](https://github.com/Chieji/Echoctl#quick-start)
- [ECHOMEN Setup Guide](#-quick-start)
- [AI Provider Configuration](#step-1-environment-setup)
- [Browser Automation (WebHawk)](#-browser-automation-webhawk-20)

### Advanced Topics

- [Multi-Agent Orchestration](#-multi-agent-orchestration)
- [Knowledge Graph & Wiki-Links](#-knowledge-graph)
- [Playbook Learning System](#-knowledge-graph)
- [Security & HITL Gates](#-security)

### API Reference

- [tRPC Router Documentation](server/routers/)
- [Database Schema](drizzle/schema.ts)
- [WebSocket Protocol](docs/WEBSOCKET_PROTOCOL.md)

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ECHOMEN.git
cd ECHOMEN

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Make changes and commit
git commit -m 'feat: add amazing feature'

# 5. Push to your fork
git push origin feature/amazing-feature

# 6. Open Pull Request
```

### Good First Issues

- [ ] Add provider health indicators to dashboard
- [ ] Implement playbook extraction UI
- [ ] Improve AXTree viewer performance
- [ ] Add mobile responsive design
- [ ] Create onboarding wizard

### Contribution Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file for details.

---

## 🔗 Related Projects

| Project | Description | Link |
|---------|-------------|------|
| **Echoctl** | CLI brain with BDI engine & provider chain | [→ GitHub](https://github.com/Chieji/Echoctl) |
| **ECHOMEN** | Web dashboard for AI orchestration | [→ GitHub](https://github.com/Chieji/ECHOMEN) |

---

## 📧 Support & Community

- **Issues & Bugs** — [Open an issue](https://github.com/Chieji/ECHOMEN/issues)
- **Discussions** — [GitHub Discussions](https://github.com/Chieji/ECHOMEN/discussions)
- **Documentation** — [Full Docs](docs/)

---

<div align="center">

**Built with ❤️ by [Chieji](https://github.com/Chieji)**

*Your thoughts. Our echo. Infinite possibility.*

[![Echoctl](https://img.shields.io/badge/View-Echoctl-4f46e5?style=for-the-badge)](https://github.com/Chieji/Echoctl)
[![ECHOMEN](https://img.shields.io/badge/View-ECHOMEN-06b6d4?style=for-the-badge)](https://github.com/Chieji/ECHOMEN)

</div>

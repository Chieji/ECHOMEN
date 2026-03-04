<div align="center">

<img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029321070/NVvajgOUYjfhzUHU.png" alt="ECHO - Autonomous AI Agent Logo" width="600"/>

**Your thoughts. My echo. Infinite possibility.**

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Security](https://img.shields.io/badge/security-hardened-green.svg)
![TypeScript](https://img.shields.io/badge/types-0%20errors-success.svg)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-Google-4285F4?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-black?style=for-the-badge&logo=framer)](https://www.framer.com/motion/)
[![Security](https://img.shields.io/badge/Security-Fortress--Grade-red?style=for-the-badge)](./AGENTS.md)

</div>

---

**ECHO** is an Elite AI Workstation designed for **Action over Conversation.** It transforms your machine into a self-orchestrating multi-agent powerhouse, fusing a high-fidelity execution engine with a persistent "Second Brain."

## 🆕 What's New in V1.1.0

### Security Hardening (Latest)
- ✅ **CSRF Protection** - Token-based CSRF validation on all state-changing operations
- ✅ **Security Headers** - OWASP-recommended headers (CSP, X-Frame-Options, HSTS, etc.)
- ✅ **Rate Limiting** - 100 requests/minute per IP to prevent DoS
- ✅ **VM2 Sandboxed Execution** - Replaced unsafe eval() with secure VM for code execution
- ✅ **Prompt Injection Guardrails** - Multi-layer defense against indirect prompt injection

### Performance Optimizations
- ✅ **Code Splitting** - Vendor libraries split into separate chunks (react, motion, ai)
- ✅ **Lazy Loading** - All 5 modals lazy-loaded with Suspense boundaries
- ✅ **Better Caching** - Content-hash based chunk naming for long-term caching

### Quality Improvements
- ✅ **Zero TypeScript Errors** - 100% type-safe codebase
- ✅ **Test Infrastructure** - Vitest setup with 15+ security tests
- ✅ **Updated Dependencies** - Express 5, latest security patches

## 🧠 The Second Brain (Knowledge & Memory)
ECHO doesn't just execute; it *remembers* and *connects*.
-   **[[Wiki-Linking]]:** Use standard wiki syntax to link notes, artifacts, and tasks.
-   **Bidirectional Echoes:** Automatic backlink detection in the Intelligence Sidebar.
-   **FlexSearch Recall:** Sub-millisecond global search across all logs and artifacts.
-   **Neural Vault:** Export your entire knowledge base as a portable, structured ZIP archive.

## ⚡ WebHawk 2.0 (Agentic Browser)
ECHO sees the web like a human.
-   **Vision Protocol:** Uses Playwright to navigate, screenshot, and reason visually.
-   **AXTree Navigation:** Reads the browser's Accessibility Tree for 100% reliable element interaction.
-   **Persistent Session:** Maintain logins and state across complex multi-step web tasks.

## 🛡️ The ECHO Fortress (Security)
Built with "Principal Architect" rigor.
-   **The Trio (SOUL/AGENTS/TOOLS):** Modular behavior injection via root-level Markdown files.
-   **Human-in-the-Loop (HITL):** Mandatory approval gate for privileged tools (Shell, Write, Delete).
-   **Zero-Config Discovery:** Backend automatically scans and proxies local MCP services.

## 🖥️ Elite Workstation UI

### Elite Workstation UI
- **CommandDeck** - Unified dashboard with 5 tabs (Execution, Artifacts, Notes, Deployments, Terminal)
- **ChatInterface** - Chat mode with Action/Chat toggle
- **Header** - Mode selection, status indicators, token usage
- **5 Configuration Modals** - ServiceConnection, AgentCreation, PlaybookCreation, ModelProvider, AppLogViewer
- **HistoryPanel** - Session history and context management
- **TerminalDisplay** - Command reference and execution logs

### Additional UI Features
- **ECHO-P (Command Palette):** Trigger global actions instantly with `Ctrl + P` or `Cmd + K`.
- **EchoBrain Pulse:** Real-time visualization of agent thoughts and system health.

## 🚀 Quick Start (V1 Miracle Build)

### Option A: Native Node.js (Development)

#### 1. The Engine (Backend)
```bash
cd backend
npm install
npm start
```
*Runs on port 3001. Handles Shell, Files, and WebHawk.*

#### 2. The Cockpit (Frontend)
```bash
npm install
npm run dev
```
*Configure your keys in the Master Configuration Panel (Settings).*

#### Development Commands
```bash
# Production build
npm run build

# Type check
npx tsc --noEmit

# Run tests
npx vitest run
```

---

### Option B: Docker (Production-Ready)

#### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+

#### Quick Start Commands

```bash
# Clone and navigate to project
cd ECHOMEN

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# API_KEY=your_google_api_key_here
# GEMINI_API_KEY=your_google_api_key_here

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

#### Individual Service Commands

```bash
# Start backend only
docker compose up echomen-backend -d

# Start frontend only
docker compose up echomen-frontend -d

# Rebuild backend after changes
docker compose build echomen-backend
docker compose up echomen-backend -d

# View backend logs
docker compose logs echomen-backend

# Access backend shell (debugging)
docker compose exec echomen-backend sh
```

#### Health Check

```bash
# Check service health
docker compose ps

# Test backend endpoint
curl http://localhost:3001/health
```

#### Resource Limits

The Docker configuration includes built-in resource limits:
| Service | CPU Limit | Memory Limit |
|---------|-----------|--------------|
| Backend | 1.0 cores | 512 MB |
| Frontend | 0.5 cores | 256 MB |

To adjust limits, edit `docker-compose.yml` under `deploy.resources`.

#### Volume Management

```bash
# View volumes
docker volume ls

# Inspect logs volume
docker volume inspect echomen-logs

# Clean up volumes (WARNING: deletes all data)
docker compose down -v
```

## 🏗️ Technical Architecture
-   **Orchestration:** Recursive ReAct loop (up to Level 3 depth).
-   **AI Bridge:** Unified abstraction for Gemini, OpenAI, and Anthropic.
-   **Secure Storage:** AES-256-GCM encrypted credentials in session memory.

## 🛡️ Security

ECHOMEN implements defense-in-depth security:

### Backend Security
- CSRF token validation on all POST/PUT/DELETE endpoints
- Rate limiting (100 req/min per IP)
- OWASP security headers (CSP, X-Frame-Options, HSTS, X-XSS-Protection)
- Secure CORS with credentials support
- Content sanitization for file operations

### Code Execution Security
- VM2 sandboxed JavaScript execution
- 5-second timeout limit
- Blocked dangerous globals (process, require, global, window, document)
- Isolated scope prevents variable leakage

### AI Security
- Indirect prompt injection detection (6 pattern categories)
- Content sanitization with XML delimiters
- Defense-in-depth (4 layers)
- Human-in-the-Loop (HITL) for privileged operations

### Dependency Security
- Regular npm audit
- Zero known vulnerabilities
- Automated security updates

The Docker setup addresses the **Command Execution Sandbox Bypass** security recommendation through containerization:

### Security Features Implemented

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Non-root User** | `echomen` user (UID 1001) | Prevents privilege escalation |
| **Read-only Root FS** | `read_only: true` + tmpfs | Prevents filesystem tampering |
| **Resource Limits** | CPU: 1.0, Memory: 512MB | Prevents DoS attacks |
| **No New Privileges** | `no-new-privileges:true` | Blocks setuid/setgid exploits |
| **Multi-stage Build** | Slim Node.js base | Minimal attack surface |
| **Network Isolation** | Dedicated bridge network | Internal service isolation |

### Security Trade-offs

> ⚠️ **Important**: Container isolation provides an additional security boundary but is **not a complete security solution**.

1. **Container Escape Risk**: A determined attacker with kernel exploits could potentially escape the container. Always combine with host-level security.

2. **Shell Command Execution**: The backend still executes shell commands. Container isolation limits blast radius but doesn't eliminate the risk. Consider:
   - Running with minimal required capabilities
   - Using seccomp profiles for additional syscall filtering
   - Implementing allowlists at the application level

3. **Browser Automation**: Playwright runs with `--no-sandbox` in containers (required for containerized Chrome). This is mitigated by:
   - Running as non-root user
   - Isolated browser contexts per task
   - Network isolation

4. **Host Network Access**: If the backend needs to access host network services:
   ```yaml
   # Use host networking (reduces isolation)
   network_mode: "host"
   
   # OR use specific port forwarding
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

### Production Hardening Recommendations

For production deployments, consider additional measures:

```bash
# Use Docker secrets for sensitive data
docker secret create api_key api_key.txt

# Apply seccomp profile
docker run --security-opt seccomp=profile.json ...

# Drop all capabilities, add only required ones
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE ...

# Use rootless Docker
# https://docs.docker.com/engine/security/rootless/
```

### Monitoring and Logging

```bash
# View real-time logs
docker compose logs -f echomen-backend

# Export logs for analysis
docker compose logs echomen-backend > backend.log

# Monitor resource usage
docker stats echomen-backend
```

---

## 🚀 V2 Roadmap

Planned improvements for V2:

- [ ] **Test Coverage** - Target 60%+ component test coverage
- [ ] **MCP Integration** - Model Context Protocol support
- [ ] **Google Workspace** - Gmail, Drive, Calendar integrations
- [ ] **Advanced Memory** - Vector embeddings for semantic search
- [ ] **Performance** - Bundle size optimization (target <1MB initial load)
- [ ] **Mobile App** - React Native companion app
- [ ] **Desktop App** - Tauri-based desktop client

---

<div align="center">
    <b>Built with ruthless precision. ECHO OUT.</b>
</div>

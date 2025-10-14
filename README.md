
<div align="center">

```
      /\\
__/\\_/  \\/\\/\\___
\\/   \\__/  \\____>
```

# ECHO - Autonomous AI Agent

**Your thoughts. My echo. Infinite possibility.**

</div>

<div align="center">

[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-Google-4285F4?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-black?style=for-the-badge&logo=framer)](https://www.framer.com/motion/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

</div>

---

**ECHO** is not just another AI chatbot. It's a browser-based autonomous agent designed to transform natural language commands into executed reality. It plans, acts, and delivers results with ruthless efficiency, orchestrating a team of specialized AI agents to achieve complex goals.

## Core Philosophy

The principle behind ECHO is simple: **Action over conversation.** While chat is a tool, the ultimate goal is execution. ECHO is designed with a persistent, stateful architecture that allows it to:

-   **Deconstruct** high-level objectives into actionable task pipelines.
-   **Orchestrate** a multi-agent system, assigning the right agent to the right task.
-   **Execute** tasks using a suite of tools, from file manipulation to web interaction.
-   **Learn** from successful executions to create reusable "Playbooks," improving its efficiency over time.

<!-- TODO: Replace this with a high-quality GIF of ECHO in action! -->
<img src="https://via.placeholder.com/800x400.png?text=ECHO+In+Action+(Replace+this+image)" alt="ECHO Demo" />

## ✨ Key Features

-   🤖 **Multi-Agent Orchestration:** A central `Core` brain delegates tasks to specialized agents like `Planner`, `Executor`, `Reviewer`, and `Synthesizer`.
-   🧠 **ReAct Logic Loop:** The `God Mode` executor uses a Reason-Act loop to make decisions, use tools, and process observations, enabling it to solve complex, multi-step problems.
-   ⚡ **Task Pipeline UI:** Visualize the entire execution plan in real-time, from queuing to completion, including dependencies between tasks.
-   📦 **Artifact Generation:** Final outputs like code blocks, documents, and reports are cleanly separated from execution logs and presented as downloadable artifacts.
-   📝 **Agent To-Do List:** Provide ECHO with high-priority objectives. The Planner uses this list as context to generate more relevant and aligned execution plans.
-   📚 **Playbook Synthesis:** ECHO learns from its successes. Completed task plans are summarized into "Playbooks" that can be instantly recalled for similar future requests.
-   ⚙️ **Master Configuration Panel (MCP):** A centralized hub to manage system instructions, connect services (e.g., GitHub, OpenAI), and create custom agents.
-   ↔️ **Dual Modes:** Switch seamlessly between `Action Mode` for task execution and `Chat Mode` for quick questions and brainstorming.
-   🖥️ **Live Terminal:** Monitor the agent's every thought, action, and observation in a familiar terminal interface.

## 🚀 Getting Started

ECHO runs entirely in your browser. To get started locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/echo-agent.git
    cd echo-agent
    ```

2.  **Set up your API Key:**
    -   Create a `.env` file in the project root.
    -   Add your Google AI Studio API key:
        ```
        API_KEY=your_google_api_key_here
        ```

3.  **Install dependencies and run:**
    This project is configured to run with a simple static server.
    ```bash
    # If you have Python 3
    python -m http.server

    # Or with Node.js
    npx serve
    ```

4.  Open your browser to the local server address (e.g., `http://localhost:8000`).

## 🛠️ Technology Stack

-   **Frontend:** React 19, TypeScript, TailwindCSS
-   **AI/LLM:** Google Gemini API (`gemini-2.5-flash`)
-   **Animation:** Framer Motion
-   **State Management:** React Hooks & Context
-   **Build Tool:** Vite (via browser module loading)

## 🗺️ Roadmap

ECHO is an evolving experiment. The next frontiers include:

-   [ ] **Real Tool Integration:** Bridge the gap from a simulated file system to real-world APIs by building secure backend proxies for services like GitHub, and an optional local server for file system access.
-   [ ] **WebHawk Agent:** Fully implement the `WebHawk` agent for autonomous web browsing, data extraction, and research.
-   [ ] **Long-Term Memory:** Integrate a vector database (e.g., Supabase with pgvector) to give ECHO persistent, searchable memory across sessions.
-   [ ] **Collaborative Agents:** Allow multiple ECHO instances to communicate and delegate tasks to each other.

## 🤝 Contributing

Contributions are welcome! If you have an idea for a new feature, agent, or tool, please open an issue to discuss it.

---

<div align="center">
    Built with precision and a bias for action.
</div>

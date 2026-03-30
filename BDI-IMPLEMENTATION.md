# ECHOMEN BDI Cognitive Architecture

## 1. Overview
ECHOMEN implements a formal **Belief-Desire-Intention (BDI)** model, transformed into a production-grade cognitive agent loop. Unlike typical "one-shot" agents, ECHOMEN maintains a structured state machine that ensures every action is reasoned, observed, and reflected upon.

## 2. The 7 Cognitive States
The `ExecutionLoop` transitions through these 7 distinct states, visualized in the `ExecutionStatusBar`:

1.  **IDLE**: The agent is waiting for a directive. Memory is clean.
2.  **PERCEIVE**: Gathering context. The agent searches semantic and episodic memory for similar past experiences or relevant playbooks.
3.  **REASON**: The `DecisionPipeline` selects the optimal tool and arguments based on the current goal and perceived context.
4.  **ACT**: Execution of the selected tool. Privileged operations (e.g., shell commands, GitHub merges) trigger a Human-in-the-Loop (HITL) approval request.
5.  **OBSERVE**: Recording the immediate outcome of the action into episodic memory and working memory.
6.  **REFLECT**: Evaluating if the goal was achieved, extracting lessons from successes or failures, and updating long-term patterns.
7.  **ERROR**: A dedicated state for handling timeouts, rate limits, or tool failures, with built-in recovery strategies.

## 3. BDI Loop Implementation
The loop is protected by `BDIHaltingGuards`, which monitor:
-   **Iteration count**: Prevents infinite loops.
-   **Accumulated cost**: Halts if token usage exceeds a USD threshold.
-   **Execution time**: Prevents hanging processes.
-   **Memory usage**: Ensures stability.

## 4. Keyboard Shortcuts Reference
ECHOMEN is designed for high-density "Workstation" grade orchestration. Use these shortcuts for rapid navigation:

-   `Ctrl + 1`: **Action Mode - Board** (View active task execution)
-   `Ctrl + 2`: **Chat Mode** (Direct interaction with the agent)
-   `Ctrl + 3`: **Action Mode - Artifacts** (Browse generated code/docs)
-   `Ctrl + 4`: **Action Mode - Notes** (Open the Brain/Note editor)
-   `Ctrl + 5`: **Action Mode - Deployments** (Manage live applications)
-   `Ctrl + P` / `Cmd + K`: **Command Palette** (Quick actions and settings)
-   `Ctrl + C`: **Termination Signal** (Gracefully halt the current execution)

## 5. Visualizing the Brain
-   **Context Panel**: Located in the right sidebar (`Squares2X2Icon`). Displays the hierarchical task tree and delegation structure.
-   **Memory Panel**: Located in the right sidebar (`BrainIcon`). Allows browsing of the agent's semantic and episodic memories with similarity scores.
-   **Status Bar**: Displays the current cognitive state and the active task title.

---
**ECHO OUT.**

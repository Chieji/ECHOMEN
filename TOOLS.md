# ECHO Master Toolbox: WebHawk 2.0 & Core Engines

## 1. WebHawk 2.0 (Agentic Browser)
High-performance Playwright-based browser with visual grounding.
- `browser_navigate`: Visit a URL.
- `browser_screenshot`: Capture visual state (The "Eyes").
- `browser_click`: Precision clicking via CSS selectors.
- `browser_type`: Human-like typing into inputs.
- `browser_get_ax_tree`: Read the Accessibility Tree for reliable navigation.

## 2. System Power
- `executeShellCommand`: (PRIVILEGED) Direct access to the local terminal.
- `executeCode`: Sandboxed JavaScript execution.
- `readFile` / `writeFile`: (WRITE IS PRIVILEGED) Native file I/O.
- `listFiles`: System discovery.

## 3. The Neural Brain
- `memory_save` / `memory_retrieve`: Persistent Firebase/Local storage.
- `memory_delete`: (PRIVILEGED) Cleanse the agent's memory.
- `createArtifact`: Generate high-fidelity output files.

## 4. Multi-Agent Bridge
- `create_and_delegate_task_to_new_agent`: Spawn specialist sub-agents.
- `askUser`: Request clarification or HITL approval.

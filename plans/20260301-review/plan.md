# ECHOMEN Post-Review Improvement Plan

## Objective
Harden the ECHOMEN workstation by resolving high-severity architectural issues and eliminating technical debt identified during the 2026-03-01 audit.

## Phases

### Phase 1: Browser Context Isolation 🌐
- Refactor `backend/index.js` to support multi-session browser contexts.
- Move from global `browser/page` variables to a task-indexed Map.
- Ensure ephemeral cleanup after each task completion.

### Phase 2: Type Safety Offensive 🛡️
- Audit `services/tools.ts` and `lib/ai_bridge.ts` to replace 60+ `any` types with strict interfaces.
- Enable `noImplicitAny` in `tsconfig.json`.
- Standardize Tool Response types.

### Phase 3: Indirect Injection Guardrails 🧱
- Implement a "Prompt Delimiter" system to isolate untrusted web data from system instructions.
- Add an automated "Intent Validator" step before executing privileged tools.

### Phase 4: Production Sandboxing 📦
- Create a `Dockerfile` for the ECHO Backend.
- Document the "Isolated Execution" mode for production deployments.

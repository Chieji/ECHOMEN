# ECHOMEN Reconstruction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ECHOMEN from a broken state (194 TypeScript errors, 5/20 audit score) to production-ready (0 errors, 16+/20 audit score).

**Architecture:** Systematic reconstruction in 4 phases: (1) Fix TypeScript compilation, (2) Create design token system, (3) Implement accessibility, (4) Remove AI aesthetic.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, tRPC, Drizzle ORM, Express

---

## Phase 1: TypeScript Compilation Fix (Priority: CRITICAL)

**Goal:** Reduce 194 TypeScript errors to 0

### Task 1.1: Install Missing Dependencies

**Files:**
- Modify: `package.json` (add dependencies)
- Test: Terminal command

- [ ] **Step 1: Add dependencies to package.json**

Run in terminal:
```bash
cd /home/lastborn/ECHOMEN
npm install express @types/express @trpc/server @trpc/client drizzle-orm superjson axios jose @types/node --legacy-peer-deps
```

Expected: Dependencies installed successfully

- [ ] **Step 2: Verify installation**

Run:
```bash
npm list express @types/express @trpc/server
```

Expected: Shows installed versions

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json node_modules/
git commit -m "chore: install missing TypeScript dependencies"
```

### Task 1.2: Fix ErrorBoundary Component

**Files:**
- Modify: `components/ErrorBoundary.tsx:1-50`
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Fix React imports**

Replace top of file:
```typescript
import * as React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[Error Boundary] Caught error:', error, errorInfo);
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center h-full p-8 bg-red-900/20 text-red-200 border border-red-500/50 rounded-lg m-4">
                    <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                    <pre className="bg-black/40 p-4 rounded overflow-auto max-w-full text-xs mb-4">
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
```

- [ ] **Step 2: Run TypeScript check**

Run:
```bash
npx tsc --noEmit components/ErrorBoundary.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/ErrorBoundary.tsx
git commit -m "fix: ErrorBoundary React types"
```

### Task 1.3: Fix Server Type Annotations

**Files:**
- Modify: `server/_core/cookies.ts`, `server/_core/index.ts`, `server/_core/systemRouter.ts`
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Fix cookies.ts**

Replace problematic lines:
```typescript
// Line 21: Add type annotation
const proto = (req.socket as any).encrypted ? 'https' : 'http';

// Line 42: Add missing domain property
const options: CookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: isSecure,
  domain: isLocalhost ? undefined : '.echomen.app',
};
```

- [ ] **Step 2: Fix index.ts**

```typescript
// Line 39: Add type annotations
app.use('/api', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
```

- [ ] **Step 3: Fix systemRouter.ts**

```typescript
// Line 23: Add type annotation
.input(z.object({ input: z.string() }))
```

- [ ] **Step 4: Run TypeScript check**

Run:
```bash
npx tsc --noEmit server/_core/*.ts
```

Expected: < 50 errors (down from 194)

- [ ] **Step 5: Commit**

```bash
git add server/_core/*.ts
git commit -m "fix: server type annotations"
```

### Task 1.4: Fix Remaining Component Errors

**Files:**
- Modify: `components/MemoryPanel.tsx`, `lib/ExecutionLoop.ts`
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Fix MemoryPanel.tsx**

```typescript
// Line 49: Add type annotation
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // ... handler logic
};
```

- [ ] **Step 2: Fix ExecutionLoop.ts**

```typescript
// Line 673: Use export type
export type { ApprovalRequest };
```

- [ ] **Step 3: Run full TypeScript check**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Expected: < 20 errors

- [ ] **Step 4: Commit**

```bash
git add components/MemoryPanel.tsx lib/ExecutionLoop.ts
git commit -m "fix: remaining component type errors"
```

### Task 1.5: Fix Drizzle Schema Imports

**Files:**
- Modify: `drizzle/schema.ts`
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Fix import**

```typescript
// Replace line 1
import { 
  int, 
  json, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp 
} from 'drizzle-orm/mysql-core';
```

- [ ] **Step 2: Run TypeScript check**

Run:
```bash
npx tsc --noEmit drizzle/schema.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add drizzle/schema.ts
git commit -m "fix: drizzle schema imports"
```

### Task 1.6: Final TypeScript Cleanup

**Files:**
- All remaining error files
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Get remaining errors**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 2: Fix each error systematically**

For each error:
1. Navigate to file:line
2. Add missing type annotation OR install missing type
3. Re-run check

- [ ] **Step 3: Verify zero errors**

Run:
```bash
npx tsc --noEmit && echo "✅ TypeScript compiles clean!"
```

Expected: "✅ TypeScript compiles clean!"

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "fix: final TypeScript errors - compilation clean"
```

---

## Phase 2: Design Token System (Priority: HIGH)

**Goal:** Replace 35 hard-coded colors with design tokens

### Task 2.1: Create Design Token CSS File

**Files:**
- Create: `client/src/styles/tokens.css`
- Test: Visual inspection

- [ ] **Step 1: Create tokens.css**

```css
:root {
  /* Brand Colors */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-secondary: #06b6d4;
  --color-secondary_hover: #0891b2;
  
  /* Semantic Colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-surface: #ffffff;
  
  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --text-inverse: #ffffff;
  
  /* Border Colors */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;
  --border-strong: #94a3b8;
  
  /* Spacing Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

.dark {
  /* Dark Mode Overrides */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #64748b;
  --border-light: #334155;
  --border-medium: #475569;
}
```

- [ ] **Step 2: Import in main.tsx**

```typescript
// Add to top of main.tsx
import './styles/tokens.css';
```

- [ ] **Step 3: Commit**

```bash
git add client/src/styles/tokens.css client/src/main.tsx
git commit -m "feat: create design token system"
```

### Task 2.2: Replace Hard-coded Colors (Batch 1)

**Files:**
- Modify: `components/ServiceConnectionModal.tsx`, `components/MasterConfigurationPanel.tsx`
- Test: `grep -n "#[0-9a-fA-F]" components/*.tsx`

- [ ] **Step 1: Replace in ServiceConnectionModal**

Find and replace:
```typescript
// Before
className="bg-[#8B5CF6] hover:bg-[#7c4ee3]"

// After
className="bg-primary hover:bg-primary_hover"
```

- [ ] **Step 2: Replace in MasterConfigurationPanel**

```typescript
// Before
className="peer-checked:bg-cyan-600 dark:peer-checked:bg-[#00D4FF]"

// After
className="peer-checked:bg-secondary dark:peer-checked:bg-secondary"
```

- [ ] **Step 3: Verify reduction**

Run:
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" components/ServiceConnectionModal.tsx components/MasterConfigurationPanel.tsx | wc -l
```

Expected: 0 (down from 35 total)

- [ ] **Step 4: Commit**

```bash
git add components/ServiceConnectionModal.tsx components/MasterConfigurationPanel.tsx
git commit -m "refactor: replace hard-coded colors with tokens (batch 1)"
```

### Task 2.3: Replace Hard-coded Colors (Batch 2)

**Files:**
- Modify: `components/ChatInterface.tsx`, `components/ExecutionDashboard.tsx`
- Test: Visual inspection in browser

- [ ] **Step 1: Replace in ChatInterface**

```typescript
// Before
className="bg-[#FF6B00]"

// After
className="bg-orange-500"
```

- [ ] **Step 2: Replace in ExecutionDashboard**

```typescript
// Before - remove gradient SVGs
<linearGradient id="line-gradient">

// After - use solid color
className="stroke-primary"
```

- [ ] **Step 3: Commit**

```bash
git add components/ChatInterface.tsx components/ExecutionDashboard.tsx
git commit -m "refactor: replace hard-coded colors (batch 2)"
```

### Task 2.4: Verify Token System

**Files:**
- Test: Grep for token usage

- [ ] **Step 1: Count token usage**

Run:
```bash
grep -r "var(--" components/ | wc -l
```

Expected: > 20 instances

- [ ] **Step 2: Count remaining hard-coded**

Run:
```bash
grep -rn "#[0-9a-fA-F]\{3,6\}" components/ | wc -l
```

Expected: < 10 (down from 35)

- [ ] **Step 3: Commit stats**

```bash
echo "Design tokens: $(grep -r 'var(--' components/ | wc -l) usages"
echo "Hard-coded colors: $(grep -rn '#[0-9a-fA-F]' components/ | wc -l) remaining"
```

---

## Phase 3: Accessibility Implementation (Priority: HIGH)

**Goal:** Add ARIA labels, keyboard navigation, focus indicators

### Task 3.1: Add ARIA Labels to Forms

**Files:**
- Modify: `components/AgentCreationModal.tsx`, `components/ServiceConnectionModal.tsx`
- Test: Screen reader (optional)

- [ ] **Step 1: Add to AgentCreationModal inputs**

```typescript
// For each input
<input
  aria-label="Agent name"
  aria-required="true"
  // ... other props
/>
```

- [ ] **Step 2: Add role to modal**

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  // ...
>
  <h2 id="modal-title">Create Agent</h2>
```

- [ ] **Step 3: Commit**

```bash
git add components/AgentCreationModal.tsx
git commit -m "feat: add ARIA labels to AgentCreationModal"
```

### Task 3.2: Add Keyboard Navigation

**Files:**
- Modify: `components/CommandDeck.tsx`, `components/ChatInterface.tsx`
- Test: Keyboard-only navigation

- [ ] **Step 1: Add tabIndex to interactive elements**

```typescript
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
```

- [ ] **Step 2: Add keyboard shortcuts**

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [openCommandPalette]);
```

- [ ] **Step 3: Commit**

```bash
git add components/CommandDeck.tsx components/ChatInterface.tsx
git commit -m "feat: add keyboard navigation"
```

### Task 3.3: Add Focus Indicators

**Files:**
- Modify: All button/input components
- Test: Tab through UI

- [ ] **Step 1: Add focus ring utility class**

In tokens.css:
```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary;
}
```

- [ ] **Step 2: Apply to all buttons**

```typescript
<button className="... focus-ring">
```

- [ ] **Step 3: Commit**

```bash
git add components/*.tsx client/src/styles/tokens.css
git commit -m "feat: add focus indicators to all interactive elements"
```

### Task 3.4: Increase Touch Targets

**Files:**
- Modify: `components/Header.tsx`, `components/HistoryPanel.tsx`, `components/CommandCenter.tsx`
- Test: Mobile device or devtools

- [ ] **Step 1: Replace w-8/h-8 with w-11/h-11**

```typescript
// Before
className="w-8 h-8"

// After
className="w-11 h-11 min-w-[44px] min-h-[44px]"
```

- [ ] **Step 2: Verify all touch targets**

Run:
```bash
grep -rn "w-8 h-8\|w-\[32\|h-\[32" components/ | wc -l
```

Expected: 0 (down from 9)

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx components/HistoryPanel.tsx components/CommandCenter.tsx
git commit -m "fix: increase touch targets to 44px minimum (WCAG 2.5.5)"
```

---

## Phase 4: Remove AI Aesthetic (Priority: MEDIUM)

**Goal:** Remove glassmorphism, backdrop-blur, gradients

### Task 4.1: Remove Backdrop Blur

**Files:**
- Modify: All modal components (4 files)
- Test: Visual inspection

- [ ] **Step 1: Replace in ModelProviderConfigurationModal**

```typescript
// Before
className="bg-white/90 dark:bg-[#141414]/90 backdrop-blur-lg"

// After
className="bg-white dark:bg-slate-900 border border-border-medium"
```

- [ ] **Step 2: Replace in other modals**

Repeat for:
- `CommandPalette.tsx`
- `PlaybookCreationModal.tsx`
- `AgentCreationModal.tsx`

- [ ] **Step 3: Verify removal**

Run:
```bash
grep -r "backdrop-blur" components/ | wc -l
```

Expected: 0 (down from 5)

- [ ] **Step 4: Commit**

```bash
git add components/*Modal.tsx components/CommandPalette.tsx
git commit -m "refactor: remove backdrop-blur from all modals"
```

### Task 4.2: Remove Glassmorphism

**Files:**
- Modify: 21 components with `bg-white/90` or transparency
- Test: Visual inspection

- [ ] **Step 1: Replace transparency with solid colors**

```typescript
// Before
className="bg-white/90"

// After
className="bg-surface border border-border-light"
```

- [ ] **Step 2: Batch replace**

Use find/replace in editor for all instances

- [ ] **Step 3: Verify**

Run:
```bash
grep -r "bg-white/\|bg-\[#.*\]/" components/ | wc -l
```

Expected: 0 (down from 21)

- [ ] **Step 4: Commit**

```bash
git add components/*.tsx
git commit -m "refactor: remove glassmorphism, use solid backgrounds"
```

### Task 4.3: Remove Gradients

**Files:**
- Modify: `components/ExecutionDashboard.tsx`
- Test: Visual inspection

- [ ] **Step 1: Replace SVG gradients with solid colors**

```typescript
// Before
<linearGradient id="line-gradient">
  <stop offset="0%" stopColor="#6366f1" />
  <stop offset="100%" stopColor="#06b6d4" />
</linearGradient>

// After
className="stroke-primary"
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -r "gradient" components/ | wc -l
```

Expected: 0 (down from 8)

- [ ] **Step 3: Commit**

```bash
git add components/ExecutionDashboard.tsx
git commit -m "refactor: remove gradients, use solid colors"
```

---

## Phase 5: Final Polish & Verification (Priority: LOW)

### Task 5.1: Run Final Audit

**Files:**
- Test: Run `/audit` skill

- [ ] **Step 1: Run audit**

Execute:
```bash
# Use the audit skill
/audit
```

- [ ] **Step 2: Verify score improvement**

Expected:
- Accessibility: 3/4 (up from 1/4)
- Performance: 3/4 (up from 1/4)
- Theming: 3/4 (up from 0/4)
- Responsive: 3/4 (up from 2/4)
- Anti-Patterns: 3/4 (up from 1/4)
- **Total: 15/20** (up from 5/20)

- [ ] **Step 3: Document results**

```bash
echo "Final Audit Score: 15/20 (Good)"
echo "TypeScript errors: 0 (down from 194)"
echo "Hard-coded colors: 0 (down from 35)"
echo "ARIA attributes: 50+ (up from 3)"
echo "Touch targets <44px: 0 (down from 9)"
echo "AI aesthetic tells: 0 (down from 34)"
```

### Task 5.2: Run Tests

**Files:**
- Test: `npm test`

- [ ] **Step 1: Run test suite**

```bash
npm test
```

Expected: All tests passing

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "chore: final polish - audit score 15/20, all tests passing"
```

---

## Acceptance Criteria

- [ ] TypeScript compiles with 0 errors (was 194)
- [ ] Design tokens: 50+ usages, 0 hard-coded colors (was 35)
- [ ] ARIA attributes: 50+ (was 3)
- [ ] Keyboard navigation: All interactive elements focusable
- [ ] Touch targets: All ≥44px (was 32px)
- [ ] AI aesthetic: 0 instances (was 34)
- [ ] Audit score: 15/20+ (was 5/20)
- [ ] All tests passing

---

## Testing Commands

```bash
# TypeScript check
npx tsc --noEmit

# Count hard-coded colors
grep -rn "#[0-9a-fA-F]\{3,6\}" components/ | wc -l

# Count token usage
grep -r "var(--" components/ | wc -l

# Count ARIA attributes
grep -r "aria-" components/ | wc -l

# Count touch targets <44px
grep -rn "w-8\|h-8" components/ | wc -l

# Count AI tells
grep -r "backdrop-blur\|gradient\|bg-white/" components/ | wc -l

# Run audit
/audit

# Run tests
npm test
```

---

**Next:** Execute this plan using subagent-driven-development or inline execution.

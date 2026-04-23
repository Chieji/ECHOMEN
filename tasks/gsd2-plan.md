# ECHOMEN Website - GSD-2 Progressive Plan

## PHASE 1: SKETCH (Current)

### Milestone 1: Foundation & Core (COMPLETE ✓)
- [x] Project initialization with Next.js + Tailwind + Shadcn/UI
- [x] Premium design system (light/dark theme toggle)
- [x] Hero section with premium aesthetic
- [x] Feature showcase grid
- [x] Installation tabs (CLI/Web)
- [x] Interactive CLI threat scanner demo
- [x] FAQ accordion
- [x] Community section
- [x] Responsive mobile design

### Milestone 2: Enhancement & Polish (IN PROGRESS)
- [ ] Fix CLI demo display (echoctl output verification)
- [ ] Verify all interactive elements work smoothly
- [ ] Test theme toggle across all sections
- [ ] Ensure mobile responsiveness on all pages
- [ ] Optimize performance and loading

### Milestone 3: Advanced Features (TBD)
- [ ] Pricing tiers section
- [ ] Integration showcase carousel
- [ ] Live notification system
- [ ] Blog/Resources section
- [ ] Email newsletter signup (requires web-db-user)

### Milestone 4: Deployment & Launch (TBD)
- [ ] Final testing and QA
- [ ] SEO optimization
- [ ] Analytics setup
- [ ] Custom domain configuration
- [ ] Production deployment

---

## PHASE 2: REFINE (After Milestone 1 Complete)

### Milestone 2 Refined Tasks

**Task 2.1: CLI Demo Verification**
- Expected artifact: Home.tsx with working echoctl demo
- Acceptance criteria:
  - Demo shows `$ echoctl scan --target api.example.com --deep`
  - Displays 5 scanning phases with realistic output
  - Shows CVE details and security issues
  - Terminal output scrolls smoothly
  - Copy-to-clipboard works on demo commands
- Verification: Manual browser test + screenshot

**Task 2.2: Theme Toggle Testing**
- Expected artifact: Verified theme switching across all sections
- Acceptance criteria:
  - Light theme: readable text on light backgrounds
  - Dark theme: readable text on dark backgrounds
  - Toggle button visible and functional
  - All components respect theme colors
  - No color mismatches or invisible text
- Verification: Visual inspection in light + dark modes

**Task 2.3: Mobile Responsiveness Audit**
- Expected artifact: Responsive design verified on mobile breakpoints
- Acceptance criteria:
  - Hero section stacks properly on mobile
  - Navigation hamburger menu works
  - Feature grid adapts to screen size
  - CLI demo terminal is readable on mobile
  - No horizontal scrolling
- Verification: Browser DevTools mobile view + real device testing

**Task 2.4: Performance Optimization**
- Expected artifact: Optimized assets and lazy loading
- Acceptance criteria:
  - Images use lazy loading
  - CSS is minified
  - No unused dependencies
  - Lighthouse score > 90
- Verification: Lighthouse audit

---

## PHASE 3: EXECUTE (Current Phase)

**Gate 1: Milestone 1 Artifacts Verified**
- [x] All components render without errors
- [x] TypeScript compilation clean
- [x] Dev server running
- [x] Premium design aesthetic applied
- [x] Light/dark theme implemented

**Current Task: Fix CLI Demo Display**
- Status: IN PROGRESS
- Expected output: echoctl threat scanning workflow visible in terminal
- Blocker: Terminal not displaying demo output clearly
- Recovery: Verify React state updates, check terminal rendering logic

---

## PHASE 4: VERIFICATION GATES

### Gate After Milestone 2: "All Interactive Elements Working"
- [ ] CLI demo runs without errors
- [ ] Theme toggle works smoothly
- [ ] Mobile menu responsive
- [ ] All buttons and links functional
- [ ] No console errors

### Gate Before Milestone 3: "Performance & Accessibility Approved"
- [ ] Lighthouse score > 90
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile-first responsive design
- [ ] All images optimized

---

## ARTIFACT TRACKING

### Current Artifacts
| Artifact | Status | Path | Notes |
|----------|--------|------|-------|
| Home.tsx | ✓ Complete | client/src/pages/Home.tsx | Premium design, CLI demo, all sections |
| index.css | ✓ Complete | client/src/index.css | Light/dark theme system |
| App.tsx | ✓ Complete | client/src/App.tsx | Theme toggle enabled |
| package.json | ✓ Complete | package.json | All dependencies installed |

### Expected Artifacts for Milestone 2
| Artifact | Expected | Verification |
|----------|----------|--------------|
| CLI demo output | Visible in terminal | Visual inspection |
| Theme toggle | Functional | Light/dark mode test |
| Mobile menu | Responsive | DevTools mobile view |
| Performance | Lighthouse > 90 | Audit report |

---

## RECOVERY STRATEGIES

### If CLI Demo Not Displaying
1. Check React state updates in runCliDemo()
2. Verify terminal container rendering
3. Check CSS for terminal styling
4. Test in browser DevTools console
5. If still broken: Rebuild terminal component from scratch

### If Theme Toggle Not Working
1. Verify ThemeProvider in App.tsx
2. Check CSS variables in index.css
3. Test theme context hook
4. Clear browser cache and reload
5. If still broken: Regenerate theme system

### If Mobile Menu Broken
1. Check hamburger button click handler
2. Verify menu animation state
3. Test on actual mobile device
4. Check z-index and positioning
5. If still broken: Rebuild menu component

---

## SUCCESS CRITERIA

**Milestone 2 Complete When:**
- ✓ CLI demo displays echoctl output correctly
- ✓ Theme toggle works in light and dark modes
- ✓ Mobile responsiveness verified
- ✓ No console errors or TypeScript warnings
- ✓ All interactive elements functional
- ✓ Performance acceptable (Lighthouse > 85)

**Milestone 3 Ready When:**
- ✓ User approves Milestone 2 deliverables
- ✓ No critical bugs reported
- ✓ All gates passed

---

## MEMORY CAPTURES

**Architecture Decision:**
- Premium aesthetic inspired by ChatGPT/Claude.ai
- Light/dark theme with CSS variables
- Interactive CLI demo with simulated threat scanning
- Responsive mobile-first design
- Framer Motion for smooth animations

**Gotcha:**
- CLI demo requires proper state management to avoid re-renders
- Theme toggle needs CSS variable updates across all components
- Mobile menu z-index must be higher than other content

**Pattern:**
- Use Framer Motion for entrance animations
- Lazy load non-critical images
- Implement proper error boundaries
- Use semantic HTML for accessibility

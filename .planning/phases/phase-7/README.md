# Phase 7: Polish & Performance — Wave 3 Bundle Optimization

## 📚 Documentation Structure

This directory contains the complete Phase 7 Wave 3 (Bundle Optimization) planning and implementation materials.

### Files in This Directory

#### Core Planning Documents

**`07-wave3-bundle-optimization-PLAN.md`** (960 lines)
- **Purpose:** Executable implementation plan for bundle optimization
- **Contents:** 
  - 6 tasks with detailed implementation instructions
  - Step-by-step code changes for each component
  - Verification commands and acceptance criteria
  - Human verification checkpoint
- **Audience:** Claude (executor) and user (verifier)
- **How to use:** Follow tasks 1-6 sequentially; complete checkpoint before marking done

**`WAVE3-SUMMARY.md`** (270 lines)
- **Purpose:** High-level overview of the entire optimization effort
- **Contents:**
  - Goals, metrics, and success criteria
  - Before/after performance comparisons
  - Key design decisions
  - Task breakdown and effort estimates
  - Quick troubleshooting links
- **Audience:** Project stakeholders, planning reference
- **How to use:** Read first for context; use during execution for reference

**`IMPLEMENTATION-GUIDE.md`** (630 lines)
- **Purpose:** Detailed technical guide with patterns, pitfalls, and troubleshooting
- **Contents:**
  - In-depth explanation of each pattern (lazy components, lazy services, manual chunks)
  - Common pitfalls with examples and fixes
  - Verification checklist (per-task and comprehensive)
  - Performance impact analysis
  - Rollback plan
- **Audience:** Implementer (Claude) during actual coding
- **How to use:** Reference when implementing tasks; check pitfalls section if something breaks

#### Research Reference

**`07-02-PLAN.md`** (3200 lines)
- Earlier phase plan (likely Wave 2 or Wave 1)
- Available for reference if needed

---

## 🎯 Quick Start

### For Understanding the Plan (5 minutes)
1. Read **WAVE3-SUMMARY.md** — high-level overview and goals
2. Skim **PLAN.md** frontmatter and success criteria
3. Check bundle structure diagram in WAVE3-SUMMARY.md

### For Implementation (2-3 hours)
1. Open **PLAN.md** — follow tasks 1-6 sequentially
2. Keep **IMPLEMENTATION-GUIDE.md** open for pattern details
3. Use **OPTIMIZATION_CHECKLIST.md** (from parent directory) for verification steps
4. Reference **IMPLEMENTATION-GUIDE.md** troubleshooting if anything breaks
5. Complete human verification checkpoint when done

### For Verification (30 minutes)
1. Run each verification command from PLAN.md
2. Follow manual verification steps in Task 6
3. Complete checkpoint review with DevTools Network tab
4. Confirm all 41 tests pass

---

## 📊 Plan at a Glance

| Aspect | Details |
|--------|---------|
| **Phase** | 07-polish-performance |
| **Wave** | 3 (Bundle Optimization) |
| **Type** | Code Splitting + Lazy Loading |
| **Tasks** | 6 implementation + 1 checkpoint |
| **Effort** | 2-3 hours total |
| **Target** | 60% bundle reduction (5.3 MB → 2.1 MB) |
| **Tests** | 41/41 must pass (zero regressions) |
| **Risk** | Low (native patterns, fully reversible) |
| **Browser** | Chrome 63+, Safari 11.1+ (Tauri default) |

---

## 🔄 Execution Flow

```
Start
  ↓
Read WAVE3-SUMMARY.md (understand context)
  ↓
Open PLAN.md
  ↓
Task 1: Lazy-load PDF → Test → Verify
  ↓
Task 2: Lazy-load Graph → Test → Verify
  ↓
Task 3: Lazy-load Notes → Test → Verify
  ↓
Task 4: Lazy-load Export → Test → Verify
  ↓
Task 5: Vite config → Build → Verify
  ↓
Task 6: Final verification → All tests pass
  ↓
Checkpoint: Human verifies all features
  ↓
Complete ✅
```

---

## ✅ Success Checklist

After implementation, all of these must be true:

### Bundle Metrics
- [ ] Main chunk: < 2.5 MB (target ~2.1 MB)
- [ ] pdf-viewer chunk: ~1.9 MB (lazy-loaded)
- [ ] code-editor chunk: ~600 KB (lazy-loaded)
- [ ] graph-canvas chunk: ~400 KB (lazy-loaded)
- [ ] export-utils chunk: ~300 KB (lazy-loaded)
- [ ] Total reduction: 60% from 5.3 MB

### Functionality
- [ ] All 41 tests pass (zero regressions)
- [ ] Chat/Papers load immediately
- [ ] PDF loads on-demand with fallback UI
- [ ] Notes loads on-demand with fallback UI
- [ ] Graph loads on-demand with fallback UI
- [ ] Export utilities load on-demand
- [ ] No console errors

### Code Quality
- [ ] Only native Vite + Svelte 5 patterns used
- [ ] pdf-init.ts unchanged (already optimal)
- [ ] All patterns match research recommendations
- [ ] Fully reversible (< 5 min rollback)

---

## 🛠️ Key Technologies

- **Vite 6.0** — Native code-splitting with dynamic imports
- **Svelte 5** — Dynamic component imports with `<svelte:component>` and `$state`/`$effect`
- **Rollup 4+** — Manual chunks configuration
- **pdfjs-dist 3.11.174** — Already optimal with `?url` worker pattern
- **Dynamic imports** — JavaScript spec, no polyfills needed

---

## 🎓 Patterns Demonstrated

### Pattern 1: Lazy Component Import
Used for **tab-gated components** (PDF, Graph):
```typescript
let PDFViewerComponent: any = $state(null)
$effect(() => {
  if (activeTab === 'pdf' && !PDFViewerComponent) {
    import('../pdf/PDFViewer.svelte').then((mod) => {
      PDFViewerComponent = mod.default
    })
  }
})
// Template: <svelte:component this={PDFViewerComponent} ... />
```

### Pattern 2: Lazy Service Import
Used for **on-demand services** (Export):
```typescript
async function handleExportPDF() {
  const { exportNotesToPDF } = await import('../../services/notes-export')
  const blob = await exportNotesToPDF(...)
}
```

### Pattern 3: Manual Chunks Configuration
Used in **vite.config.ts** to group related libraries:
```typescript
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('pdfjs-dist')) return 'pdf-viewer'
      if (id.includes('codemirror')) return 'code-editor'
      // ... etc
    }
  }
}
```

---

## 📈 Performance Impact

**Startup Time (3G Network):**
- Before: 14s to interactive
- After: 5.6s to interactive
- **Improvement: 60% faster** ⚡

**Bundle Size:**
- Before: 5.3 MB (all features bundled)
- After: 2.1 MB main + lazy chunks
- **Reduction: 60%** 📉

**User Experience:**
- Chat users: Immediate responsiveness
- PDF researchers: 5.6s startup + 2s PDF chunk = 7.6s (still 46% faster)
- Graph users: 5.6s startup + 1.5s graph chunk = 7.1s (still 49% faster)
- Export users: 5.6s startup + minimal export chunk = faster overall

---

## 🚨 Common Pitfalls

### ❌ Module-Level Imports Defeat Code-Splitting
```typescript
// WRONG - defeats lazy-loading
import PDFViewer from '../pdf/PDFViewer.svelte'

$effect(() => {
  if (activeTab === 'pdf') {
    // Too late, PDFViewer already loaded
  }
})
```

**Fix:** Move import inside effect or function

### ❌ Missing Loading Fallback → Blank Screen
```svelte
<!-- WRONG - no feedback while loading -->
{#if activeTab === 'pdf'}
  <svelte:component this={PDFViewerComponent} ... />
{/if}
```

**Fix:** Add loading placeholder
```svelte
{#if activeTab === 'pdf'}
  {#if PDFViewerComponent}
    <svelte:component ... />
  {:else}
    Loading PDF viewer...
  {/if}
{/if}
```

### ❌ Not Excluding From optimizeDeps
```typescript
// WRONG - pre-bundles lazy libraries
optimizeDeps: {
  include: [..., 'pdfjs-dist', 'codemirror']
}
```

**Fix:** Use exclude instead
```typescript
optimizeDeps: {
  exclude: ['pdfjs-dist', 'codemirror', '@xyflow/svelte', ...]
}
```

See **IMPLEMENTATION-GUIDE.md** for detailed pitfalls and fixes.

---

## 🔄 Rollback Plan

If something breaks catastrophically, revert in < 5 minutes:

```bash
git checkout HEAD -- \
  src/lib/components/layout/MainPanel.svelte \
  src/lib/components/editor/NotesPanel.svelte \
  src/lib/components/editor/ExportDialog.svelte \
  vite.config.ts

pnpm build
npm test
```

All changes are additions/modifications only, no breaking changes.

---

## 📞 Getting Help

### During Implementation

**"Something doesn't look right..."**
→ Check **IMPLEMENTATION-GUIDE.md** Common Pitfalls section

**"Tests are failing..."**
→ Verify components are lazy-loaded, may need mocking

**"Chunks aren't creating..."**
→ Check vite.config.ts manualChunks in build.rollupOptions

**"Blank screen while loading..."**
→ Add {#if Component}...{:else}Loading{/if} to template

### References in This Directory

- **WAVE3-SUMMARY.md** — Quick reference, metrics, decisions
- **PLAN.md** — Complete task breakdown with code
- **IMPLEMENTATION-GUIDE.md** — Patterns, pitfalls, troubleshooting
- **OPTIMIZATION_CHECKLIST.md** (parent) — Verification steps

### External References

- **RESEARCH.md** (parent) — Deep technical background (988 lines)
- **vite.dev** — Official Vite 6.0 docs
- **svelte.dev** — Official Svelte 5 docs
- **rollupjs.org** — Official Rollup docs

---

## 🎯 Next Steps After Wave 3

Once Wave 3 is complete:

1. **Celebrate** 🎉 — 60% bundle reduction achieved!
2. **Create SUMMARY.md** — Record results, deviations, learnings
3. **Continue Phase 7:**
   - Wave 1: Cross-platform polish (if not done)
   - Wave 2: Accessibility improvements (if not done)
   - Wave 4+: Release preparation, documentation

---

## 📅 Document Versions

| Document | Lines | Created | Last Updated | Status |
|----------|-------|---------|--------------|--------|
| PLAN.md | 960 | 2025-03-13 | 2025-03-13 | Ready |
| WAVE3-SUMMARY.md | 270 | 2025-03-13 | 2025-03-13 | Ready |
| IMPLEMENTATION-GUIDE.md | 630 | 2025-03-13 | 2025-03-13 | Ready |
| README.md | (this) | 2025-03-13 | 2025-03-13 | Ready |

---

**Phase 7 Wave 3 is ready for implementation. Let's ship it! 🚀**

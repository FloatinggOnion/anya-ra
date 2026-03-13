# Phase 7 Wave 3: Bundle Optimization Plan Summary

## 📋 Overview

**Phase:** 07-polish-performance  
**Wave:** 3 (Bundle Optimization)  
**Status:** Ready for Execution  
**Type:** Code Splitting & Lazy Loading  

**Goal:** Reduce initial bundle from 5.3 MB → 2.1 MB (60% reduction) via native Vite 6.0 code-splitting.

---

## 🎯 What Gets Built

### 5 Implementation Tasks + 1 Verification Checkpoint

| Task | Focus | Files | Effort | Saves |
|------|-------|-------|--------|-------|
| 1 | Lazy-load PDF.js | MainPanel.svelte | 20 min | 1.9 MB |
| 2 | Lazy-load @xyflow | MainPanel.svelte | 15 min | 400 KB |
| 3 | Lazy-load CodeMirror | NotesPanel.svelte | 15 min | 600 KB |
| 4 | Lazy-load Export utils | ExportDialog.svelte | 15 min | 300 KB |
| 5 | Vite manual chunks | vite.config.ts | 15 min | Config |
| 6 | Verify + Test | (all) | 30 min | Validation |
| → | **Checkpoint** | *User verification* | 10 min | Approval |

**Total Implementation Time:** ~2 hours  
**Total with Testing:** ~2.5 hours  

---

## 📦 Bundle Structure (After Optimization)

```
dist/
├── js/
│   ├── main-[hash].js           ~210 KB (down from 5.3 MB!)
│   ├── pdf-viewer-[hash].js      1.9 MB (lazy)
│   ├── code-editor-[hash].js     600 KB (lazy)
│   ├── graph-canvas-[hash].js    400 KB (lazy)
│   ├── export-utils-[hash].js    300 KB (lazy)
│   ├── vendor-[hash].js          200 KB (shared)
│   └── ...
└── css/
```

**Key Insight:** Main bundle shrinks 95% (5.3 MB → 210 KB), with feature chunks loading on-demand.

---

## 🚀 Performance Impact

### Startup Performance (3G Network)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Initial Load (to interactive)** | 14s | 5.6s | ⚡ **60% faster** |
| **PDF researcher startup** | 14s | 7.6s | ✅ Still faster |
| **Graph user startup** | 14s | 7.1s | ✅ Still faster |
| **Chat-only user startup** | 14s | 5.6s | ⚡ **60% faster** |

### Memory Impact
| Feature | Before | After | When Loaded |
|---------|--------|-------|-------------|
| PDF.js | Always | On demand | PDF tab click |
| CodeMirror | Always | On demand | Notes tab open |
| @xyflow | Always | On demand | Graph tab click |
| Export libs | Always | On demand | Export button click |

---

## 🔑 Key Design Decisions

✅ **Use native Vite 6.0 + Svelte 5 patterns**
- No custom loaders or orchestration
- Dynamic imports built into JavaScript spec
- Supported on Chrome 63+, Safari 11.1+ (Tauri default)

✅ **Keep pdf-init.ts unchanged**
- Already using optimal `?url` pattern for worker
- Worker loads asynchronously in chunk

✅ **Conditional rendering prevents blank screens**
- Each lazy component has loading fallback
- User sees "Loading [feature]..." instead of blank screen

✅ **Manual chunks config groups related libraries**
- pdfjs-dist → pdf-viewer chunk
- codemirror → code-editor chunk
- @xyflow → graph-canvas chunk
- jspdf/html2canvas/docx → export-utils chunk

---

## ✅ Success Criteria

All of these must be true after implementation:

### Bundle Size ✅
- [ ] Main chunk: < 2.5 MB (target ~2.1 MB)
- [ ] pdf-viewer chunk: ~1.9 MB
- [ ] code-editor chunk: ~600 KB
- [ ] graph-canvas chunk: ~400 KB
- [ ] export-utils chunk: ~300 KB
- [ ] Total reduction: 60% from 5.3 MB

### Lazy-Loading ✅
- [ ] PDF.js loads only on PDF tab click
- [ ] CodeMirror loads only on Notes tab open
- [ ] @xyflow loads only on Graph tab click
- [ ] Export utils load only on export button click
- [ ] Loading fallback UI shown during load
- [ ] No blank screens

### Functionality ✅
- [ ] All 41 tests pass (zero regressions)
- [ ] Chat feature works immediately
- [ ] Papers/search work immediately
- [ ] PDF viewing works end-to-end with lazy loading
- [ ] Notes editing works end-to-end with lazy loading
- [ ] Graph visualization works end-to-end with lazy loading
- [ ] Export functionality works end-to-end with lazy loading
- [ ] No console errors

### Code Quality ✅
- [ ] No custom solutions used
- [ ] All patterns match research recommendations
- [ ] Code is readable and maintainable
- [ ] Fully reversible (< 5 min rollback)

---

## 🛠️ Implementation Patterns

### Pattern 1: Lazy Component (PDF, Graph)
```typescript
let PDFViewerComponent: any = $state(null)

$effect(() => {
  if (activeTab === 'pdf' && !PDFViewerComponent) {
    import('../pdf/PDFViewer.svelte').then((mod) => {
      PDFViewerComponent = mod.default
    })
  }
})
```

### Pattern 2: Lazy Service (Export)
```typescript
async function handleExportPDF() {
  const { exportNotesToPDF } = await import('../../services/notes-export')
  const blob = await exportNotesToPDF(...)
}
```

### Pattern 3: Manual Chunks Config
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

## 📊 Research Quality

- **Source:** RESEARCH.md (988 lines), OPTIMIZATION_CHECKLIST.md (181 lines)
- **Confidence:** HIGH
- **Validation:** Vite 6.0 official docs, Svelte 5 official docs, project codebase
- **Browser Support:** Chrome 63+, Safari 11.1+ (Tauri default)
- **Rollback Risk:** LOW (< 5 min revert, no breaking changes)

---

## 📝 Execution Notes

### Before Starting
1. Read PLAN.md completely
2. Read IMPLEMENTATION-GUIDE.md for detailed patterns
3. Have OPTIMIZATION_CHECKLIST.md handy for verification steps

### During Implementation
- Follow tasks 1-6 in order
- Run `npm test` after each task
- Check `pnpm build` output to verify chunks
- Use IMPLEMENTATION-GUIDE.md if something breaks

### During Verification (Task 6 + Checkpoint)
- Use DevTools Network tab to verify chunk loading
- Test all features manually (Chat, PDF, Notes, Graph, Export)
- Confirm 41/41 tests pass
- Get user approval before marking complete

### Common Gotchas
1. **Forgetting `.default`** when importing modules → `mod.default`
2. **Module-level imports** that defeat code-splitting → Move inside functions
3. **Missing loading fallback** → Users see blank screen
4. **Not excluding from optimizeDeps** → Chunks still pre-bundled

---

## 🎓 Learning Outcomes

After implementing Wave 3, you'll understand:
- How Vite 6.0 code-splitting works under the hood
- Dynamic imports and their performance implications
- Svelte 5 `$state`, `$effect`, and `<svelte:component>` patterns
- How to configure Rollup for manual chunks
- Bundle optimization trade-offs and strategies

---

## 📞 Troubleshooting Quick Links

- **PDF chunk not creating?** → Check manualChunks in vite.config.ts
- **Blank screens while loading?** → Add {#if Component}...{:else}Loading...{/if}
- **Tests failing?** → Components are now lazy, may need mocking
- **Chunks not loading in browser?** → Verify Network tab, check for 404s
- **pnpm dev is slow?** → Normal, lazy libs aren't pre-bundled

See IMPLEMENTATION-GUIDE.md for detailed troubleshooting.

---

## ✨ Next After Wave 3

Once Wave 3 is complete:
- Bundle is optimized (60% reduction achieved)
- User experience greatly improved on slow networks
- Foundation set for future lazy-loading of other features

Remaining Phase 7 work:
- Wave 1: Cross-platform polish (Windows/Linux UI adjustments)
- Wave 2: Accessibility improvements (a11y audit, keyboard navigation)
- Wave 3: ✅ Bundle optimization (THIS)
- Wave 4+: Release preparation, documentation

---

## 📚 Reference Files

- **PLAN.md** — Full task breakdown and implementation details
- **IMPLEMENTATION-GUIDE.md** — Detailed patterns, pitfalls, troubleshooting
- **OPTIMIZATION_CHECKLIST.md** — Quick verification steps
- **RESEARCH.md** — Deep technical background (988 lines)
- **vite.config.ts** — Current Vite configuration (to be updated in Task 5)

---

## 🏁 Ready to Start?

Execute Wave 3 with:
```bash
/gsd:execute-phase phase-7 --plan wave3
```

Or manually follow PLAN.md tasks 1-6.

**Estimated total time:** 2.5-3 hours  
**Complexity:** Medium (pattern-heavy, repetitive)  
**Risk:** Low (native patterns, fully reversible)  

**Let's ship it! 🚀**

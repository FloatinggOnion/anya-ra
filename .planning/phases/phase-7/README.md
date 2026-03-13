# Phase 7: Polish & Performance (Planned)

## Phase Overview

Phase 7 focuses on cross-platform polish, performance optimizations, and release preparation for Anya-RA v1.0.

**Phase Goal:** Production-ready application with smooth performance, comprehensive testing, and polished user experience.

---

## Wave Structure

### Wave 1: Foundation Setup (Not Yet Planned)
- [ ] 07-01-PLAN.md — [Awaiting planning]
- [ ] Infrastructure, types, stores

### Wave 2: Export Workspace ✅ PLANNED
- [x] **07-02-PLAN.md** — Complete ZIP + HTML + Search
  - Export workspace as ZIP with full-text search
  - Papers as HTML, metadata serialization, optional PDFs
  - UI: Export dialog + progress indicator
  - Services: workspace-export, search-index, paper-html, index-html
  - 66 new tests (zero regressions to 41 baseline)
  - Expected: 70-95 minutes to execute

### Wave 3: Bundle Optimization (Planned)
- [ ] 07-wave3-bundle-optimization-PLAN.md — Code splitting, lazy loading, compression analysis

---

## Files in Phase 7 Directory

| File | Purpose |
|------|---------|
| `07-02-PLAN.md` | Implementation plan for Wave 2 (Export Workspace) |
| `README.md` | This file — phase overview and structure |
| `IMPLEMENTATION-GUIDE.md` | General guidance for Phase 7 implementation |
| `WAVE3-SUMMARY.md` | Summary for Wave 3 bundle optimization |

---

## Requirement IDs

Phase 7 requirements map to specific deliverables:

### Wave 2: Export Workspace
- **EXPORT-01:** User can export workspace as ZIP archive
- **EXPORT-02:** ZIP contains searchable index of papers
- **EXPORT-03:** Papers rendered as HTML with notes
- **EXPORT-04:** Export dialog with options (PDFs, annotations, graph)
- **EXPORT-05:** Optional PDF inclusion with toggle (default OFF)

### Deferred to Wave 3+
- **PERF-01:** Bundle size optimization (target <8MB)
- **PERF-02:** Code splitting for large features
- **PERF-03:** Lazy loading for PDF viewer
- **BUNDLE-01:** Tree-shaking unused dependencies

---

## Execution Order

```
Wave 2 (07-02) ← START HERE
    ↓
Wave 3 (07-wave3) ← After Wave 2 complete
    ↓
Phase Complete → Release v1.0
```

---

## Next Steps

1. **Read 07-02-PLAN.md** for detailed task breakdown
2. **Execute:** `/gsd:execute-phase 07-02`
3. **After completion:** Create SUMMARY.md in this directory
4. **Then plan Wave 3** for bundle optimization (if needed)

---

## Status Tracking

| Wave | Status | Files | Tasks | Est. Duration |
|------|--------|-------|-------|---------------|
| 1 | ⏳ Planned | - | - | - |
| 2 | ✅ Planned | 07-02-PLAN.md | 7 | 70-95 min |
| 3 | ⏳ Planned | 07-wave3-PLAN.md | - | - |

---

**Last Updated:** March 13, 2025
**Phase Lead:** Claude (Tauri v2 + Svelte 5)
**Project:** Anya-RA v1.0

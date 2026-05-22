---
status: partial
phase: 09-conservative-inline-suggestions
source: [09-VERIFICATION.md]
started: 2026-05-22T02:30:00Z
updated: 2026-05-22T02:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Sidebar appearance and layout
expected: Open a document. 280px SuggestionsSidebar appears to the right of the editor. Three sections (Papers, Ideas, Completions) are collapsible. Empty states show appropriate messaging.
result: [pending]

### 2. Continuous paper suggestions
expected: Type text and paper suggestions appear/update continuously in the Papers section. Relevance scores as colored bars. No LLM calls (pure keyword matching).
result: [pending]

### 3. Section boundary detection
expected: Type text, press Enter twice, pause 500ms. Ideas and Completions sections show loading spinners, then populate with generated content.
result: [pending]

### 4. Manual Suggest button
expected: Click "Suggest" button. Loading spinners show. Ideas/completions generate on demand regardless of section boundary.
result: [pending]

### 5. Click-to-insert: Paper citation
expected: Click a paper suggestion. Contextual citation with framing text inserted at cursor. Framing text varies on repeated clicks of same paper.
result: [pending]

### 6. Click-to-insert: Text completion
expected: Click a text completion. Text inserted at cursor. Sidebar clears that completion card.
result: [pending]

### 7. Citation style picker
expected: Open Settings, change citation style, click paper suggestion. Next insertion uses new citation format.
result: [pending]

### 8. Sidebar layout toggle
expected: Toggle between sectioned and unified layouts. Preference persists across document switches.
result: [pending]

### 9. Multi-provider fallback toast
expected: Make primary LLM provider unavailable. Toast notification appears. Fallback provider handles request.
result: [pending]

### 10. Ghost text absence (regression)
expected: Open document, type text. No ghost text appears inline. Tab and Escape have no suggestion behavior.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps

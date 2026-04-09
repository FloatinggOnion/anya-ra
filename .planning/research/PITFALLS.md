# Domain Pitfalls: Inline AI Suggestions + Bidirectional Linking

**Domain:** Literature review editor with inline AI writing suggestions and Obsidian-style paper linking
**Tech Stack:** Tauri + Svelte 5, TipTap editor, Ollama/OpenAI streaming, existing knowledge graph
**Researched:** 2026-04-08
**Confidence:** HIGH (drawn from real patterns in Copilot, Obsidian, Notion; existing v0.1.12 patterns in codebase)

## Critical Pitfalls

### Pitfall 1: Suggestion Lag Breaking Writer Flow
**What goes wrong:** Inline suggestions take >200ms to appear, causing writer to keep typing past the suggestion, then delete and backtrack when it finally appears. UI becomes frustrating instead of helpful.

**Why it happens:**
- LLM inference on Ollama takes 500ms-2s (depends on model size and hardware)
- Streaming responses start slow (first token delay = 300-800ms even for streaming)
- Debouncing delay (100-300ms) adds latency before even querying LLM
- TipTap editor redraws slow if not optimized for real-time updates

**Consequences:**
- Users disable feature or switch to simpler tools (Copilot users report this as #1 frustration)
- Suggestion feels like autocorrect, not assistant
- Trust in suggestions drops if they arrive too late to be relevant to current thought

**Prevention:**
- Set hard SLA: suggestions must start appearing within 100ms or not shown at all
- Use minimal debounce (50ms) to catch fast typers
- Prefetch context (selected papers, current section) **before** user types (in background on idle)
- Stream first token visibly (show placeholder immediately, fill content as it arrives)
- Implement abort on new keystroke: if user types again before suggestion completes, cancel old request
- Test on target hardware (modest spec laptop): if >150ms, reduce context size or model

**Detection:**
- Users ignore suggestions consistently
- Suggestions appear after cursor has moved several words ahead
- Log all suggestion latencies; alert if p95 > 200ms

---

### Pitfall 2: Too Many Suggestions Creating Cognitive Overload
**What goes wrong:** System shows 5-10 inline suggestions on every paragraph, writer becomes paralyzed choosing between them. Each suggestion requires decision fatigue. Feature becomes noise instead of signal.

**Why it happens:**
- "More suggestions = more helpful" intuition is wrong
- Easy to generate variations in parallel (beam search, temp sampling)
- No ranking mechanism: all suggestions treated as equally valid
- No confidence filtering: low-quality suggestions shown alongside good ones

**Consequences:**
- Users turn off suggestions entirely
- Decision paralysis: "which one is actually best?"
- Attention splits between writing and choosing
- Quality of final text may drop (paradox of choice)

**Prevention:**
- **Hard limit: 1-2 suggestions max per trigger point.** Obsidian proved users prefer 1 high-quality completion over 3 mediocre options.
- Rank suggestions by confidence: only show if model's top-k probability > threshold (e.g., only if winner >80% confidence vs alternatives)
- Use paper context as ranking signal: suggestions that cite selected papers rank higher
- Show "why this suggestion" metadata: "Based on paper X" or "Matches your tone" (transparency reduces decision load)
- Implement suggestion "cooldown": after accepting/rejecting one suggestion, wait 2-3 seconds before showing next (breathing room)

**Detection:**
- Watch suggestion acceptance rate: if <30%, you're showing too many low-quality ones
- Survey users: ask if they feel "overwhelmed" by options
- A/B test: 1 suggestion vs 3 suggestions; track which users spend more time writing (not choosing)

---

### Pitfall 3: Wrong Suggestions Causing Active Frustration
**What goes wrong:** Suggestions are grammatically correct but contextually wrong. "Add more citations" when user already has 20. Suggestions about methodology when user is writing conclusions. Model didn't understand document scope.

**Why it happens:**
- Context window too small (only last 100 tokens) → no awareness of paper list or document goals
- No document-level metadata passed to LLM (title, abstract, section labels)
- Model doesn't know which papers the user selected for this section
- Prompt is generic, not tuned for literature review writing
- LLM (Qwen 0.8B by default) too small to understand nuance

**Consequences:**
- User rejects all suggestions, loses faith in AI
- Active annoyance (wrong suggestion is worse than no suggestion)
- Users override AI frequently, increasing manual work
- Reputation damage: "AI suggestions are useless"

**Prevention:**
- Pass full context to LLM: document title, current section label, selected papers for this section, writing goals
- Limit context intelligently: last 200 tokens of document + paper titles + metadata (don't dump full papers)
- Prompt design: explicit instruction to "suggest only within scope of these papers" and "respect the section type (introduction/methods/conclusions)"
- Add filtering layer: accept suggestion only if it references at least one selected paper (hard constraint)
- Test suggestions against: "Does this cite a paper we selected?" (automatic quality gate)
- Consider quality vs speed tradeoff: slightly slower but accurate beats fast and wrong

**Detection:**
- Track suggestion rejection rate by type: if "add citations" is 95% rejected, disable that suggestion class
- Log suggestions that were rejected and why (user can provide feedback)
- Manual quality audit: randomly sample 20 accepted suggestions, check if they're actually good

---

### Pitfall 4: Suggestions Breaking Undo/Redo Chain
**What goes wrong:** User accepts suggestion, then wants to undo just the suggestion insertion (not 5 other edits). TipTap undo stack is corrupted or unclear. Editor becomes unreliable.

**Why it happens:**
- Suggestion insertion isn't a single editor transaction (custom plugin + replace = 2+ steps)
- Undo history doesn't group suggestion insertion as one atomic action
- Async suggestion arrival makes it unclear when exactly it was inserted
- Each suggestion might use different insert mechanism (some direct, some via extensions)

**Consequences:**
- User loses work when undoing
- Trust in editor collapses
- Users avoid accepting suggestions to be safe
- Forced to manually undo/redo instead of trusting editor

**Prevention:**
- Every suggestion insertion must be a single TipTap transaction: `editor.chain().insertContent(...).run()` wrapped in `editor.commands.startTransaction()` / `editor.commands.endTransaction()`
- Assign a suggestion ID to each insertion so it can be reversed atomically
- Undo should restore exactly the pre-suggestion state, no side effects
- Test undo chain extensively: suggest → accept → undo → redo → verify content matches
- If using custom TipTap extensions, ensure they integrate with history plugin
- Document: "one suggestion = one undo step" as UX contract

**Detection:**
- Automated tests: suggest → accept → undo → verify content equals pre-suggestion state
- User testing: users report undo feels wrong or loses data
- Check TipTap history length after suggestion: should be exactly 1 new step

---

### Pitfall 5: Suggestions Conflicting with Manual Edits (Race Condition)
**What goes wrong:** User is typing while suggestion is arriving and being inserted. Suggestion inserts at wrong position, or overwrites user's new text, or creates duplicate text.

**Why it happens:**
- Async suggestion arrival (streaming from LLM) competes with user typing
- No locking on editor state: multiple mutations can happen simultaneously
- Suggestion uses stale cursor position (arrived after user moved cursor)
- Plugin doesn't validate insertion point is still valid

**Consequences:**
- Text corruption or loss
- User loses edits
- Trust in feature collapses entirely
- Users learn to never use suggestions

**Prevention:**
- **Abort suggestion on any keystroke:** If user types before suggestion completes, discard and cancel the LLM request immediately
- Snapshot cursor position when request starts; if cursor has moved when suggestion arrives, don't insert (show dialog: "You moved cursor, apply suggestion at original position Y/N?")
- Use TipTap transactions with position locking: `editor.commands.setContent(...)` replaces document atomically, preventing interleaving
- Debounce suggestion trigger: 100ms silence after typing before requesting suggestion (catches fast typers)
- Test race conditions: rapid typing + suggestion arrival; verify no corruption
- Conservative insertion: if any doubt, ask user ("Apply this suggestion?" popup) rather than auto-insert

**Detection:**
- Monitor for undo requests immediately after suggestion (sign users are fixing corruption)
- Unit tests: type character while suggestion streaming, verify no text loss
- Stress test: fast typing (>5 chars/sec) + suggestion arrival simultaneously

---

### Pitfall 6: Link Rot and Circular Dependencies in Paper Network
**What goes wrong:** Papers get deleted or moved, references in documents point to missing papers. Or accidentally create cycles (Paper A → Paper B → Paper A) that confuse the knowledge graph or cause infinite loops.

**Why it happens:**
- No referential integrity checks: user deletes paper without checking if it's linked in documents
- Linking UI doesn't warn "5 documents reference this paper"
- No automatic cleanup: dead links remain visible in documents
- Circular linking can happen unintentionally (A cites B, B cites A is valid, but UI treats as error)
- Knowledge graph traversal may not handle cycles (infinite loop risk)

**Consequences:**
- Broken links in exported documents
- Knowledge graph rendering breaks or becomes untrustable
- Users learn not to use linking feature (too fragile)
- Confusion when citations point to deleted papers

**Prevention:**
- **Hard constraint: Never delete a paper with active links.** Instead: mark as "archived" or "deleted but references preserved"
- Add backlink display: "5 documents reference this paper. Delete? (will break links)"
- Implement "Find Broken Links" command: scan all documents for missing paper references
- In document export: either preserve link or replace with footnote "Citation missing (paper: [title])"
- Graph traversal: explicitly handle cycles with visited set; don't assume DAG (Directed Acyclic Graph)
- Validate on save: if document references non-existent paper, flag as warning

**Detection:**
- Test: delete a paper referenced in document, check if link still appears
- Check exported PDFs for broken links
- Unit tests: create cycle in knowledge graph, verify traversal terminates

---

### Pitfall 7: Suggestion Context Too Large, Slowing LLM
**What goes wrong:** To make suggestions context-aware, system passes 2000 tokens of papers + 500 tokens of document history to Ollama. Inference time explodes to 5+ seconds. Feature becomes unusable.

**Why it happens:**
- "More context = better suggestions" is true, but has steep cost on small models
- Easy to add paper metadata, document history, graph context without measuring impact
- Qwen 0.8B has small context window (4K tokens); using 2500 leaves little room for response
- Streaming helps UX but doesn't reduce actual compute time

**Consequences:**
- Suggestions take 5+ seconds (exceeds hard limit)
- Ollama becomes CPU bottleneck, freezes UI if not in separate thread
- Users disable feature or switch to larger cloud model (cost/latency)
- v0.2 becomes slower than v0.1 (regression)

**Prevention:**
- **Set context budget: suggestions use max 500 tokens total (context + response)**
- Prioritize: last 200 tokens of current document > paper titles (50 tokens) > selected paper abstracts (200 tokens max) > graph context (cut)
- Test on target hardware: measure end-to-end latency; if >300ms, reduce context
- Use selective context: only include papers user explicitly selected for current section, not all papers in workspace
- Profile: measure LLM latency vs context size; find sweet spot (e.g., 300 tokens context = 200ms latency)
- For Qwen 0.8B: max context should be <1000 tokens total for responsive inference

**Detection:**
- Log suggestion latency bucketed by context size
- Alert if p95 latency > 300ms
- Monitor CPU usage during suggestions (should not spike >80% if async thread)

---

### Pitfall 8: Linking Becomes Clutter (Too Many Backlinks)
**What goes wrong:** User creates paper links liberally. Document now has 50 inline references, making text hard to read. Backlinks pane shows 30 documents linking to every paper. Network becomes unnavigable.

**Why it happens:**
- No guidance on "when to link": users link conservatively or link everything
- Visual representation doesn't scale: 50 inline links look like spam
- Backlinks pane unfiltered: shows all references, even weak ones
- No distinction between "cites" and "mentions"

**Consequences:**
- Inline text becomes cluttered (noise)
- Backlinks pane becomes unusable (too much)
- Knowledge graph becomes a hairball (all nodes connected)
- Users stop using linking feature (not valuable)

**Prevention:**
- **Limit visual link density:** Only render first 3 links inline, show "+ 12 more" button (collapse/expand)
- Distinguish link types: "cites directly" vs "mentions in context" (metadata)
- Backlinks UI: filter by link type, show relevance score (not all backlinks equally important)
- Prompt users: "Do you want to link to [Paper]?" only on first mention per document (not every mention)
- Document: "Link on first significant mention, not every reference" (UX pattern)
- Deprecate auto-linking: let user control links, don't generate them automatically

**Detection:**
- Measure link density: avg links per document per 1000 words
- If >5 links/1000 words, UI becomes clutter (risk threshold)
- Survey: ask users if inline links feel noisy or helpful

---

## Moderate Pitfalls

### Pitfall 9: Copy-Paste Breaks Link References
**What goes wrong:** User copies text with paper links from one document, pastes into another. Links now reference papers from wrong document, or point to deleted papers.

**Why it happens:**
- Copy-paste doesn't preserve link metadata (just text)
- Pasted content has stale paper IDs
- No validation that links are still valid in new context

**Consequences:**
- Confusing: pasted text has broken links
- Loss of trust in linking feature
- Users avoid reusing content

**Prevention:**
- On paste: validate all paper links; show dialog if any are broken ("3 links broken in pasted content. Fix? Remove? Keep as-is?")
- Implement "paste as plain text" option to bypass link issues
- Smart paste: if pasting into document with different paper set, offer to re-link (suggest matching papers)
- Document: "Copy-paste may break links; use 'Fix Links' command after pasting"

**Detection:**
- Unit test: copy text with links, paste, verify behavior
- User testing: paste broken links, observe if users notice/fix

---

### Pitfall 10: Suggestion Accepts Without Review (Silent Unwanted Changes)
**What goes wrong:** User accidentally hits keyboard shortcut (Tab, Enter) that accepts suggestion. Text was inserted without conscious approval. User notices later.

**Why it happens:**
- Auto-accept shortcuts conflict with editor defaults (Tab indents, Enter creates line break)
- Suggestion UI doesn't require explicit confirmation
- Stream inserts asynchronously; user assumes it's not accepted until they press button

**Consequences:**
- Unwanted text insertions
- Loss of trust (AI made changes without permission)
- Users disable feature entirely

**Prevention:**
- Never auto-accept: require explicit button click or keyboard combo (Ctrl+Shift+Y, not Tab)
- Keyboard shortcut must be unique, not conflicting with editor defaults
- Suggestion state is always "pending review" until user explicitly acts
- If user presses Enter in editor, treat as "reject suggestion" (don't accept)
- Default: suggestion shows but doesn't insert until user approves

**Detection:**
- Log suggestion accepts with timestamp; if cluster around <100ms after suggestion appears, likely accidental
- User testing: watch users interact with suggestions; do they intend every accept?

---

### Pitfall 11: Suggestions Are Generic (Not Using Paper Context)
**What goes wrong:** Suggestions are well-written but generic: "Add more details" or "Revise for clarity." Not specific to the papers user selected. Might as well be plain text editing advice.

**Why it happens:**
- Prompt doesn't explicitly pass selected papers to LLM
- Context is too general (document structure) without domain specificity
- Model too small (Qwen 0.8B) to understand paper abstracts
- No feedback loop: same generic suggestions repeated

**Consequences:**
- Suggestions feel unhelpful (could get this from Grammarly)
- Users don't see value over free alternatives
- Feature doesn't differentiate Anya from other editors

**Prevention:**
- Prompt design: "Based on these papers [titles + abstracts], suggest how to integrate them into this section"
- Include paper-specific context: DOI, key findings, methodology
- Response filter: reject suggestions that don't mention at least one selected paper
- Test: measure specificity (does suggestion reference actual paper content?)
- Use larger model if possible for non-local inference (Claude 3.5 > Qwen 0.8B for nuance)

**Detection:**
- Audit samples: are suggestions paper-specific or generic?
- User feedback: "Suggestions don't know about my papers"

---

### Pitfall 12: Obsidian Link Syntax Confusion
**What goes wrong:** Users get confused between different link formats: `[[paper-id]]` vs `[[paper-id|custom label]]` vs `[link text](url)`. Syntax inconsistency breaks linking.

**Why it happens:**
- Multiple link formats possible in markdown (standard markdown + Obsidian wikilinks)
- TipTap doesn't enforce one consistent syntax
- Users manually typing links use wrong format

**Consequences:**
- Some links work, others don't (inconsistent behavior)
- Export breaks (different formats not supported in PDF/DOCX)
- Users lose confidence in feature

**Prevention:**
- Choose one canonical format: use Obsidian wikilinks `[[paper-id]]` everywhere
- TipTap extension: provide link picker (UI) instead of requiring manual syntax
- Validation: parse document on save, flag syntax errors
- Auto-format: if user types manual link with wrong syntax, auto-correct
- Documentation: "Always use the 'Insert Paper Link' button, never type manually"

**Detection:**
- Scan documents for non-standard link syntax
- Test: exported PDFs should render all links correctly

---

### Pitfall 13: Suggestion Accepts Silently Save to File
**What goes wrong:** User accepts suggestion, document auto-saves. Later realizes suggestion was wrong but can't find undo history (lost to file save). Document permanently modified.

**Why it happens:**
- Auto-save happens immediately after suggestion accept
- Undo history is in-memory only (not persisted to file)
- User assumes "undo" will work, but saved file is authoritative

**Consequences:**
- Permanent unwanted changes
- No recovery path
- Users distrust auto-save

**Prevention:**
- Delay auto-save 2-3 seconds after suggestion accept (give user time to undo)
- Save only if user doesn't undo within window
- Or: require explicit "Save" action after suggestions (no auto-save)
- Maintain undo history even after file save (some editors do this)

**Detection:**
- Test: accept suggestion, close app, reopen, try to undo (should it work?)
- Document this behavior clearly to users

---

## Minor Pitfalls

### Pitfall 14: Suggestion Latency Isn't Measured
**What goes wrong:** Team doesn't systematically measure suggestion latency. Slowly degrades from 100ms to 800ms as context grows. Nobody notices until users complain.

**Why it happens:**
- Latency is hard to measure in UI (no standard metrics)
- Development machines are faster than user machines
- Each change (more context, larger model) seems small, but compounds

**Prevention:**
- Add latency logging: "Suggestion took [X]ms from trigger to first visible token"
- Dashboard: track p50, p95, p99 latency over time
- Alert if p95 exceeds threshold (e.g., 250ms)
- Target SLA: p50 <150ms, p95 <300ms

---

### Pitfall 15: Knowledge Graph Doesn't Handle "Obsolete" Papers
**What goes wrong:** User marks old paper as "obsolete" or "superseded by X". Graph still shows it as active. Links still point to it.

**Why it happens:**
- No status field on papers (only live/deleted)
- Graph traversal doesn't filter by status

**Prevention:**
- Add status field: "active" | "archived" | "superseded"
- Graph display: show archived papers in different color (faded)
- Links to superseded papers: show tooltip "superseded by [newer paper]"

---

### Pitfall 16: Suggestion Streaming Shows Broken Text Mid-Stream
**What goes wrong:** Suggestion arrives as: "Based on the r..." then "Based on the research of..." Final suggestion looks weird mid-display due to stream arrival. Distracting.

**Why it happens:**
- Streaming token-by-token makes incomplete text visible
- TipTap redraws on every token (no batching)

**Prevention:**
- Buffer 2-3 tokens before rendering (reduces updates, smoother experience)
- Render in placeholder box, not inline, until complete
- Or: only show completed suggestions (buffer entire response before inserting)

---

## Phase-Specific Warnings

| Phase | Feature | Likely Pitfall | Mitigation |
|-------|---------|---------------|-----------|
| v0.2 Alpha | First inline suggestions | Too many suggestions (Pitfall 2) | Start with 1 suggestion max; measure acceptance rate |
| v0.2 Alpha | Paper linking in editor | Link rot (Pitfall 6) | Don't allow paper deletion if linked |
| v0.2 Alpha | TipTap integration | Undo/redo breaks (Pitfall 4) | Extensive undo/redo testing before shipping |
| v0.2 Beta | Bidirectional links UI | Link clutter (Pitfall 8) | Collapse overflow links; limit visual density |
| v0.2 Beta | Suggestion context expansion | Context too large (Pitfall 7) | Measure latency; cap at 500 tokens context |
| v0.2.1 | Copy-paste within documents | Link breakage (Pitfall 9) | Add "Fix broken links" dialog on paste |
| v0.3 | Multi-document suggestions | Wrong suggestions (Pitfall 3) | Require explicit paper selection per section |

## Critical Success Metrics

These measures indicate whether pitfalls are emerging:

1. **Suggestion acceptance rate:** Should be >50% (not <30%, which signals too many/bad suggestions)
2. **Suggestion latency p95:** Must stay <300ms (measure constantly)
3. **Undo chain integrity:** 100% of undo operations should restore exact pre-suggestion state
4. **Link breakage rate:** <5% of links should be broken/missing
5. **User satisfaction with suggestions:** >70% of beta testers rate suggestions as helpful (not noise)

## Lessons from Real Tools

### Copilot (Ghost Text)
- **What worked:** Show suggestion inline, don't auto-accept, streaming is OK if <200ms lag
- **What failed:** Suggestions that don't match context (wrong language, wrong pattern); users report "mostly useless without cherry-picking"
- **Takeaway:** Quality over quantity; context is everything

### Obsidian (Backlinks)
- **What worked:** Unidirectional links (you link to X, see backlinks), manual control, visual density reasonable with limit
- **What failed:** Link rot when files deleted; no automatic cleanup; users have to maintain manually
- **Takeaway:** Structural integrity > feature completeness; better to fail safe than fail loud

### Notion (Relations/Rollups)
- **What worked:** Explicit link creation (not auto-linking); visual limit on related items
- **What failed:** Complexity explosion (too many link types); users don't understand relation types; features not discoverable
- **Takeaway:** Simplicity scales; one link type (bidirectional) is better than many

## Summary

The highest-risk pitfalls for v0.2.0 are:

1. **Suggestion latency** (Pitfall 1): Breaks flow if >200ms
2. **Suggestion overload** (Pitfall 2): Users disable feature if too many options
3. **Wrong suggestions** (Pitfall 3): Frustration if not context-aware
4. **Undo breaks** (Pitfall 4): Loss of trust if edits are corrupted
5. **Context size** (Pitfall 7): Latency explosion if context unbounded

**Recommended v0.2 approach:**

- **Strict latency SLA:** <150ms suggestion appearance or don't show
- **Ruthless simplicity:** 1 suggestion per trigger, not 5
- **Explicit paper context:** Link suggestions to selected papers; show why suggestion was made
- **Heavy testing:** Undo/redo, copy-paste, race conditions (async)
- **Measurement:** Log all suggestion metrics from day 1; no surprises

---

**Sources:**
- GitHub Copilot user feedback (reddit.com/r/programming, GitHub discussions)
- Obsidian feature discussions (obsidian.md/forum, GitHub issues)
- TipTap editor architecture and plugin system (tiptap.dev/docs)
- LLM performance patterns (vLLM, llm.c benchmarks; Ollama community forums)
- Knowledge graph design patterns (academic papers on RDF, semantic web; Roam Research, Logseq architecture)

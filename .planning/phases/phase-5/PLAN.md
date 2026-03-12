---
phase: phase-5
plan: 01
type: execute
wave: multi                 # 5-wave execution (see Wave Structure below)
depends_on: []
files_modified:
  - src/lib/types/graph.ts
  - src/lib/stores/graph.ts
  - src/lib/services/graph.ts
  - src/lib/components/graph/GraphCanvas.svelte
  - src/lib/components/graph/GraphToolbar.svelte
  - src/lib/components/graph/NodeEditor.svelte
  - src/lib/components/graph/nodes/PaperNode.svelte
  - src/lib/components/graph/nodes/ConceptNode.svelte
  - src/lib/components/graph/nodes/NoteNode.svelte
  - src/lib/components/graph/edges/TypedEdge.svelte
  - src/lib/components/layout/MainPanel.svelte
  - src/lib/components/PaperDetail.svelte
  - src-tauri/src/commands/graph.rs
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/lib.rs
  - src/App.svelte
autonomous: true
requirements: [GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05, GRAPH-06, GRAPH-07, GRAPH-08, GRAPH-09]

must_haves:
  truths:
    - "User can open the Graph tab and see a canvas (not a blank/broken panel)"
    - "Paper nodes appear in the graph for papers in the workspace"
    - "User can drag to connect two nodes and see an edge drawn between them"
    - "User can create a concept node with a label and description"
    - "User can create a note node with free text"
    - "Graph layout (node positions + viewport) survives a full app restart"
    - "Deleting a paper from the workspace removes its orphaned node on next load"
    - "Double-clicking a paper node navigates to that paper in the sidebar"
    - "User can delete a node or edge with the Backspace/Delete key"
  artifacts:
    - path: "src/lib/types/graph.ts"
      provides: "GraphNode, GraphEdge, GraphFile discriminated-union types"
      exports: [GraphNode, GraphEdge, GraphFile, AnyNodeData, GraphNodeType, EdgeRelation]
    - path: "src/lib/stores/graph.ts"
      provides: "Writable stores graphNodes, graphEdges + ensurePaperNode helper"
    - path: "src/lib/services/graph.ts"
      provides: "loadGraph(), saveGraph() calling Rust commands"
    - path: "src-tauri/src/commands/graph.rs"
      provides: "save_graph_file, load_graph_file Tauri commands"
    - path: "src/lib/components/graph/GraphCanvas.svelte"
      provides: "SvelteFlow root with controlled pattern, nodeTypes at module scope"
    - path: "src/lib/components/layout/MainPanel.svelte"
      provides: "Updated with Graph tab (🕸 Graph button + activeTab === 'graph' branch)"
  key_links:
    - from: "src/lib/components/graph/GraphCanvas.svelte"
      to: "src/lib/stores/graph.ts"
      via: "onnodeschange/onedgeschange callbacks → graphNodes.set()/graphEdges.set()"
      pattern: "graphNodes\\.set|graphEdges\\.set"
    - from: "src/lib/stores/graph.ts"
      to: "src/lib/services/graph.ts"
      via: "persistGraph() — debounced save triggered on every store mutation"
      pattern: "persistGraph|debouncedSave"
    - from: "src/lib/services/graph.ts"
      to: "src-tauri/src/commands/graph.rs"
      via: "invoke('save_graph_file') / invoke('load_graph_file')"
      pattern: "invoke.*save_graph_file|invoke.*load_graph_file"
    - from: "src/App.svelte"
      to: "src/lib/services/graph.ts"
      via: "initializeGraph() called after workspace + papers loaded in onMount"
      pattern: "initializeGraph"
    - from: "src/lib/components/PaperDetail.svelte"
      to: "src/lib/stores/graph.ts"
      via: "ensurePaperNode() called from 'Add to Graph' button"
      pattern: "ensurePaperNode"
---

<objective>
Phase 5 adds a visual knowledge graph canvas to Anya-RA. Users can view their papers as
nodes, create concept and note nodes, draw typed edges between any pair, and have the full
graph (layout + viewport) persist across sessions in `{workspace}/graph.json`.

Purpose: Transform isolated papers into a connected research map — the core value of a
"Research Assistant" product.

Output:
- New tab "🕸 Graph" in MainPanel alongside Chat / Papers / PDF
- Three custom node types (PaperNode, ConceptNode, NoteNode) + TypedEdge
- Rust file I/O commands for graph.json
- Store + service layer for reactive, persisted graph state
- "Add to Graph" affordance on PaperDetail
- Debounced auto-save + workspace-load integration
</objective>

<execution_context>
@/Users/paul/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/ROADMAP.md

<!-- Key source files to understand patterns -->
@src/lib/types/paper.ts
@src/lib/types/annotation.ts
@src/lib/stores/papers.ts
@src/lib/components/layout/MainPanel.svelte
@src-tauri/src/commands/chat.rs
@src-tauri/src/lib.rs
@src/App.svelte

<interfaces>
<!-- Types executor needs from existing codebase — no exploration required -->

From src/lib/types/paper.ts:
```typescript
export interface Paper {
  id: string          // e.g. "arxiv_2301.00001"
  title: string
  authors: string[]
  year: number | null
  source: PaperSource
  // ...other fields
}
```

From src/lib/stores/papers.ts:
```typescript
export const papers = writable<Paper[]>([])
export const selectedPaperId = writable<string | null>(null)
// read $papers to get the live list
```

From src/App.svelte onMount (current pattern):
```typescript
onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    const loaded = await loadPapers($workspace.path)
    papers.set(loaded)
  }
  // ← initializeGraph() goes HERE, after papers are loaded
})
```

From src-tauri/src/lib.rs invoke_handler (current, add graph commands here):
```rust
commands::chat::save_chat_file,
commands::chat::load_chat_file,
commands::chat::list_chat_files,
// ← add graph commands below these
```

From src-tauri/src/commands/ (directory pattern — create graph.rs here):
```
src-tauri/src/commands/
  mod.rs          ← add `pub mod graph;`
  chat.rs         ← mirror this pattern
  workspace.rs
  papers.rs
```
</interfaces>
</context>

---

## Wave Structure

| Wave | Tasks | Can run in parallel | Prerequisite |
|------|-------|--------------------|-|
| 1 | p5-t01, p5-t02 | ✅ Yes | none |
| 2 | p5-t03, p5-t04 | ✅ Yes | Wave 1 complete |
| 3 | p5-t05 | — single task | Wave 2 complete |
| 4 | p5-t06, p5-t07, p5-t08 | ✅ Yes | Wave 3 complete |
| 5 | p5-t09 | — polish | Wave 4 complete |

---

<tasks>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 1 — Foundations (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p5-t01" type="auto" wave="1" depends_on="[]">
  <name>p5-t01: Install @xyflow/svelte + define TypeScript graph types</name>

  <files>
    package.json (modified — new dep added by pnpm)
    src/lib/types/graph.ts (CREATE)
  </files>

  <action>
**Step 1 — Install the library:**
```bash
cd /Users/paul/Documents/programming/anya-ra
pnpm add @xyflow/svelte
```
This adds `@xyflow/svelte@1.5.1` (or latest 1.x) to `dependencies`. Verify peerDep `svelte ^5.25.0` is satisfied by the existing `svelte` version in `package.json`.

**Step 2 — Create `src/lib/types/graph.ts` with the full discriminated-union type system:**

```typescript
/**
 * Knowledge Graph type definitions for Phase 5.
 * Stored in {workspace}/graph.json — schema version 1.
 */

import type { Node, Edge } from '@xyflow/svelte'

// ─── Discriminators ──────────────────────────────────────────────────────────

/** Which kind of node renders in the canvas */
export type GraphNodeType = 'paper' | 'concept' | 'note'

/** Semantic relationship between two nodes */
export type EdgeRelation = 'related' | 'supports' | 'contradicts' | 'cites' | 'custom'

// ─── Node data payloads (discriminated by nodeType) ───────────────────────────

/** Paper node: linked to a Paper in the papers store */
export interface PaperNodeData {
  nodeType: 'paper'
  paperId: string        // links to Paper.id (e.g. "arxiv_2301.00001")
  title: string          // denormalized for display — authoritative source is papers store
  authors: string[]      // denormalized — first author shown in node
  year: number | null    // denormalized
}

/** Concept node: user-created idea / topic */
export interface ConceptNodeData {
  nodeType: 'concept'
  label: string          // short title shown in node header
  body: string           // longer description (plain text; markdown acceptable)
  color?: string         // optional accent color (CSS hex, e.g. "#a78bfa")
}

/** Note node: free-form sticky note */
export interface NoteNodeData {
  nodeType: 'note'
  body: string           // raw text content
  color?: string         // sticky-note background color (CSS hex)
}

/** Union of all possible node data payloads */
export type AnyNodeData = PaperNodeData | ConceptNodeData | NoteNodeData

// ─── SvelteFlow node and edge types ──────────────────────────────────────────

/**
 * A SvelteFlow Node typed for Anya.
 * Node.type ('paper' | 'concept' | 'note') matches nodeTypes map keys in GraphCanvas.
 * Node.data is always typed as AnyNodeData — narrow with `data.nodeType` discriminant.
 */
export type GraphNode = Node<AnyNodeData, GraphNodeType>

/** Edge data payload */
export interface GraphEdgeData {
  relation: EdgeRelation  // semantic type shown as edge label
  label?: string          // optional display-label override (shows instead of relation)
  directed: boolean       // true = arrow at target, false = plain line
}

/** A SvelteFlow Edge typed for Anya */
export type GraphEdge = Edge<GraphEdgeData>

// ─── Persistence schema ───────────────────────────────────────────────────────

/**
 * Shape of {workspace}/graph.json.
 * Intentionally minimal — only what SvelteFlow needs to restore state.
 * Paper nodes are re-validated against the papers store on load (orphan filtering).
 */
export interface GraphFile {
  /** Always 1 — bump if breaking schema change is needed */
  version: 1
  nodes: Array<{
    id: string
    type: GraphNodeType
    position: { x: number; y: number }
    data: AnyNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    data: GraphEdgeData
  }>
  /** Last-known viewport — restored as initialViewport on load */
  viewport: { x: number; y: number; zoom: number }
}
```

No other files change in this task.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# 1. Package installed
grep '"@xyflow/svelte"' package.json

# 2. Type file compiles clean (no tsc errors on the new file)
npx tsc --noEmit --strict src/lib/types/graph.ts 2>&1 | head -20

# 3. All expected exports present
grep -E "^export (type|interface)" src/lib/types/graph.ts
```
  </verify>

  <done>
- `@xyflow/svelte` appears in `package.json` dependencies
- `src/lib/types/graph.ts` exists and exports: `GraphNodeType`, `EdgeRelation`, `PaperNodeData`, `ConceptNodeData`, `NoteNodeData`, `AnyNodeData`, `GraphNode`, `GraphEdge`, `GraphEdgeData`, `GraphFile`
- `npx tsc --noEmit` produces zero errors on the new file
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p5-t02" type="auto" wave="1" depends_on="[]">
  <name>p5-t02: Rust persistence commands — save_graph_file / load_graph_file</name>

  <files>
    src-tauri/src/commands/graph.rs (CREATE)
    src-tauri/src/commands/mod.rs (MODIFY — add pub mod graph)
    src-tauri/src/lib.rs (MODIFY — register two new commands)
  </files>

  <action>
**Step 1 — Create `src-tauri/src/commands/graph.rs`:**

Mirror the pattern from `chat.rs` exactly. Simpler than chat because graph is a single file (no per-id sub-files):

```rust
use std::fs;
use std::path::PathBuf;

/// Save the knowledge graph JSON to `{workspace_path}/graph.json`.
///
/// Called from TypeScript: `invoke('save_graph_file', { workspacePath, content })`
/// `content` is the fully-serialized GraphFile JSON string.
#[tauri::command]
pub fn save_graph_file(workspace_path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path).join("graph.json");
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to write graph.json: {}", e))
}

/// Load the knowledge graph JSON from `{workspace_path}/graph.json`.
///
/// Called from TypeScript: `invoke('load_graph_file', { workspacePath })`
/// Returns `Err` if file doesn't exist — TypeScript caller maps this to `null`.
#[tauri::command]
pub fn load_graph_file(workspace_path: String) -> Result<String, String> {
    let path = PathBuf::from(&workspace_path).join("graph.json");
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read graph.json: {}", e))
}
```

**Step 2 — Register the module in `src-tauri/src/commands/mod.rs`:**

Add `pub mod graph;` alongside the existing module declarations. The file currently has:
```rust
pub mod workspace;
pub mod papers;
pub mod keystore;
pub mod chat;
pub mod annotations;
```
Add:
```rust
pub mod graph;
```

**Step 3 — Register the commands in `src-tauri/src/lib.rs`:**

Inside `.invoke_handler(tauri::generate_handler![...])`, add the two new commands after the existing `chat` commands:
```rust
commands::graph::save_graph_file,
commands::graph::load_graph_file,
```
The full handler block will include these two lines after `commands::annotations::compute_pdf_hash`.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# Build the Tauri backend — confirms no Rust compile errors
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -20

# Confirm functions are present
grep -n "pub fn save_graph_file\|pub fn load_graph_file" src-tauri/src/commands/graph.rs

# Confirm registered in lib.rs
grep "graph::" src-tauri/src/lib.rs
```
  </verify>

  <done>
- `src-tauri/src/commands/graph.rs` exists with `save_graph_file` and `load_graph_file`
- `cargo build` succeeds with zero errors
- Both commands appear in `lib.rs` invoke_handler
- `graph` module declared in `commands/mod.rs`
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 2 — Store + Custom Nodes (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p5-t03" type="auto" wave="2" depends_on="[p5-t01, p5-t02]">
  <name>p5-t03: Graph store (Svelte writable) + service layer</name>

  <files>
    src/lib/stores/graph.ts (CREATE)
    src/lib/services/graph.ts (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/services/graph.ts`:**

Thin wrapper over Tauri `invoke` — no business logic here, just I/O:

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { GraphFile } from '$lib/types/graph'

/**
 * Load graph.json from the workspace.
 * Returns null if the file doesn't exist yet (first run).
 */
export async function loadGraph(workspacePath: string): Promise<GraphFile | null> {
  try {
    const json = await invoke<string>('load_graph_file', { workspacePath })
    const parsed = JSON.parse(json) as GraphFile
    if (parsed.version !== 1) {
      console.warn('[graph] Unknown graph.json version:', parsed.version)
      return null
    }
    return parsed
  } catch {
    // File doesn't exist yet — normal on first run
    return null
  }
}

/**
 * Save the current graph state to graph.json in the workspace.
 * `graphFile` is the full GraphFile object (nodes, edges, viewport).
 */
export async function saveGraph(workspacePath: string, graphFile: GraphFile): Promise<void> {
  const content = JSON.stringify(graphFile, null, 2)
  await invoke<void>('save_graph_file', { workspacePath, content })
}
```

**Step 2 — Create `src/lib/stores/graph.ts`:**

```typescript
import { writable, get } from 'svelte/store'
import { workspace } from '$lib/stores/workspace'
import { papers } from '$lib/stores/papers'
import { loadGraph, saveGraph } from '$lib/services/graph'
import type { GraphNode, GraphEdge, GraphFile, AnyNodeData } from '$lib/types/graph'
import type { Paper } from '$lib/types/paper'

// ─── Core stores ─────────────────────────────────────────────────────────────

/** Current nodes — consumed by GraphCanvas via $graphNodes */
export const graphNodes = writable<GraphNode[]>([])

/** Current edges — consumed by GraphCanvas via $graphEdges */
export const graphEdges = writable<GraphEdge[]>([])

/**
 * Last-known viewport from useSvelteFlow().toObject().
 * Passed as `initialViewport` to SvelteFlow on load.
 */
export const graphViewport = writable<{ x: number; y: number; zoom: number }>({
  x: 0,
  y: 0,
  zoom: 1,
})

// ─── Persistence (debounced) ──────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Schedule a debounced save (300ms). Called from GraphCanvas on every
 * onnodeschange / onedgeschange / onconnect event.
 *
 * NOTE: viewport is passed in by the caller because it requires
 * `useSvelteFlow().toObject()` which can only run inside the SvelteFlow context.
 */
export function persistGraph(viewport: { x: number; y: number; zoom: number }): void {
  graphViewport.set(viewport)

  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    const ws = get(workspace)
    if (!ws?.path) return

    const nodes = get(graphNodes)
    const edges = get(graphEdges)

    const graphFile: GraphFile = {
      version: 1,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as 'paper' | 'concept' | 'note',
        position: n.position,
        data: n.data as AnyNodeData,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data!,
      })),
      viewport,
    }

    try {
      await saveGraph(ws.path, graphFile)
    } catch (err) {
      console.error('[graph] Failed to persist graph:', err)
    }
  }, 300)
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Load graph.json and hydrate stores. Called from App.svelte onMount
 * AFTER papers have been loaded — so orphan filtering works correctly.
 *
 * Orphan rule: paper nodes whose paperId no longer exists in the papers
 * store are silently dropped (paper was deleted). Edges whose source or
 * target node was dropped are also removed.
 */
export async function initializeGraph(): Promise<void> {
  const ws = get(workspace)
  if (!ws?.path) return

  const file = await loadGraph(ws.path)
  if (!file) {
    // First run — nothing to restore
    graphNodes.set([])
    graphEdges.set([])
    return
  }

  const activePaperIds = new Set(get(papers).map((p) => p.id))

  // Filter out orphaned paper nodes
  const validNodes: GraphNode[] = file.nodes
    .filter((n) => {
      if (n.type === 'paper') {
        const paperId = (n.data as { paperId: string }).paperId
        return activePaperIds.has(paperId)
      }
      return true // concept and note nodes are always valid
    })
    .map(
      (n): GraphNode => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })
    )

  const validNodeIds = new Set(validNodes.map((n) => n.id))

  // Drop edges that reference deleted nodes
  const validEdges: GraphEdge[] = file.edges
    .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
    .map(
      (e): GraphEdge => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data,
      })
    )

  graphNodes.set(validNodes)
  graphEdges.set(validEdges)
  graphViewport.set(file.viewport ?? { x: 0, y: 0, zoom: 1 })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Add a paper to the graph if it's not already present.
 * Places new nodes at a pseudo-random position in a 800×600 area
 * so they don't all stack on top of each other.
 * Called from PaperDetail "Add to Graph" button and from addPaper() side-effect.
 */
export function ensurePaperNode(paper: Paper): void {
  graphNodes.update((nodes) => {
    const alreadyExists = nodes.some(
      (n) => n.data.nodeType === 'paper' && (n.data as { paperId: string }).paperId === paper.id
    )
    if (alreadyExists) return nodes

    const newNode: GraphNode = {
      id: `paper-${paper.id}`,
      type: 'paper',
      position: {
        x: 80 + Math.random() * 720,
        y: 80 + Math.random() * 520,
      },
      data: {
        nodeType: 'paper',
        paperId: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
      },
    }
    return [...nodes, newNode]
  })
}

/**
 * Add a concept node at a given position (or default center).
 * Returns the new node id.
 */
export function addConceptNode(
  label: string,
  body: string,
  position?: { x: number; y: number }
): string {
  const id = `concept-${crypto.randomUUID()}`
  graphNodes.update((nodes) => [
    ...nodes,
    {
      id,
      type: 'concept',
      position: position ?? { x: 300, y: 300 },
      data: { nodeType: 'concept', label, body },
    },
  ])
  return id
}

/**
 * Add a note node at a given position (or default center).
 * Returns the new node id.
 */
export function addNoteNode(body: string, position?: { x: number; y: number }): string {
  const id = `note-${crypto.randomUUID()}`
  graphNodes.update((nodes) => [
    ...nodes,
    {
      id,
      type: 'note',
      position: position ?? { x: 400, y: 300 },
      data: { nodeType: 'note', body },
    },
  ])
  return id
}
```
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# TypeScript compile check
npx tsc --noEmit 2>&1 | grep -E "graph\.(ts|svelte)" | head -20

# Confirm exports
grep -E "^export" src/lib/stores/graph.ts
grep -E "^export" src/lib/services/graph.ts
```
  </verify>

  <done>
- `src/lib/stores/graph.ts` exports: `graphNodes`, `graphEdges`, `graphViewport`, `persistGraph`, `initializeGraph`, `ensurePaperNode`, `addConceptNode`, `addNoteNode`
- `src/lib/services/graph.ts` exports: `loadGraph`, `saveGraph`
- `npx tsc --noEmit` shows no errors in these files
- `persistGraph` accepts a viewport argument and debounces at 300ms
- `initializeGraph` filters orphaned paper nodes and their attached edges
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p5-t04" type="auto" wave="2" depends_on="[p5-t01]">
  <name>p5-t04: Custom node components and TypedEdge (module-scope nodeTypes)</name>

  <files>
    src/lib/components/graph/nodes/PaperNode.svelte (CREATE)
    src/lib/components/graph/nodes/ConceptNode.svelte (CREATE)
    src/lib/components/graph/nodes/NoteNode.svelte (CREATE)
    src/lib/components/graph/edges/TypedEdge.svelte (CREATE)
    src/lib/components/graph/nodeTypes.ts (CREATE)
  </files>

  <action>
⚠️ **CRITICAL: nodeTypes MUST be defined at module scope — not inline in a Svelte `<script>` block.**
Defining `const nodeTypes = {...}` inside a component script creates a new object reference on every reactive update, causing SvelteFlow to remount all nodes (visible flicker, lost inline-edit state). The fix is a separate `.ts` file imported by `GraphCanvas.svelte`.

**Step 1 — Create `src/lib/components/graph/nodeTypes.ts`:**
```typescript
// Module-level stable references — imported by GraphCanvas.svelte
// DO NOT move these into a component <script> block.
import PaperNode from './nodes/PaperNode.svelte'
import ConceptNode from './nodes/ConceptNode.svelte'
import NoteNode from './nodes/NoteNode.svelte'
import TypedEdge from './edges/TypedEdge.svelte'
import type { NodeTypes, EdgeTypes } from '@xyflow/svelte'

export const nodeTypes: NodeTypes = {
  paper: PaperNode,
  concept: ConceptNode,
  note: NoteNode,
}

export const edgeTypes: EdgeTypes = {
  typed: TypedEdge,
}
```

**Step 2 — Create `src/lib/components/graph/nodes/PaperNode.svelte`:**
```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps } from '@xyflow/svelte'
  import type { PaperNodeData } from '$lib/types/graph'
  import { selectedPaperId } from '$lib/stores/papers'

  // SvelteFlow passes `data` and `id` via props
  let { data, id }: NodeProps<PaperNodeData> = $props()

  // First author, truncated at 20 chars
  const firstAuthor = $derived(
    data.authors[0]
      ? data.authors[0].split(',')[0].trim().slice(0, 20) +
          (data.authors[0].length > 20 ? '…' : '')
      : ''
  )
  const authorLine = $derived(
    firstAuthor + (data.authors.length > 1 ? ' et al.' : '') + (data.year ? ` · ${data.year}` : '')
  )
</script>

<div class="paper-node">
  <Handle type="target" position={Position.Top} />
  <div class="badge">📄 Paper</div>
  <div class="title">{data.title}</div>
  {#if authorLine}
    <div class="meta">{authorLine}</div>
  {/if}
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .paper-node {
    background: var(--color-surface-2, #1e1e2e);
    border: 1.5px solid var(--color-border-strong, #45475a);
    border-radius: 8px;
    padding: 10px 14px;
    min-width: 160px;
    max-width: 240px;
    cursor: default;
    font-family: inherit;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted, #6c7086);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary, #cdd6f4);
    line-height: 1.35;
    /* clamp to 3 lines */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    font-size: 11px;
    color: var(--color-text-muted, #6c7086);
    margin-top: 4px;
  }
</style>
```

**Step 3 — Create `src/lib/components/graph/nodes/ConceptNode.svelte`:**
```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps } from '@xyflow/svelte'
  import type { ConceptNodeData } from '$lib/types/graph'

  let { data }: NodeProps<ConceptNodeData> = $props()
</script>

<div class="concept-node" style={data.color ? `--accent: ${data.color}` : ''}>
  <Handle type="target" position={Position.Top} />
  <div class="badge">💡 Concept</div>
  <div class="label">{data.label}</div>
  {#if data.body}
    <div class="body">{data.body}</div>
  {/if}
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .concept-node {
    background: var(--color-surface-2, #1e1e2e);
    border: 1.5px solid var(--accent, #89b4fa);
    border-radius: 10px;
    padding: 10px 14px;
    min-width: 140px;
    max-width: 220px;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent, #89b4fa);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-primary, #cdd6f4);
  }
  .body {
    font-size: 12px;
    color: var(--color-text-secondary, #a6adc8);
    margin-top: 5px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
```

**Step 4 — Create `src/lib/components/graph/nodes/NoteNode.svelte`:**
```svelte
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps } from '@xyflow/svelte'
  import type { NoteNodeData } from '$lib/types/graph'

  let { data }: NodeProps<NoteNodeData> = $props()
</script>

<div class="note-node" style={data.color ? `background: ${data.color}` : ''}>
  <Handle type="target" position={Position.Top} />
  <div class="badge">📝 Note</div>
  <div class="body">{data.body}</div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .note-node {
    background: #313244;
    border: 1px solid #585b70;
    border-radius: 6px;
    padding: 10px 12px;
    min-width: 130px;
    max-width: 200px;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: #f9e2af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .body {
    font-size: 12px;
    color: #cdd6f4;
    line-height: 1.45;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
```

**Step 5 — Create `src/lib/components/graph/edges/TypedEdge.svelte`:**

Uses `EdgeLabelRenderer` to paint the relation label mid-edge. Conditionally shows arrow via `markerEnd`.

```svelte
<script lang="ts">
  import { EdgeLabelRenderer, getBezierPath } from '@xyflow/svelte'
  import type { EdgeProps } from '@xyflow/svelte'
  import type { GraphEdgeData, EdgeRelation } from '$lib/types/graph'

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style = '',
  }: EdgeProps<GraphEdgeData> = $props()

  const [edgePath, labelX, labelY] = $derived(
    getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  )

  const relationColors: Record<EdgeRelation, string> = {
    related: '#6c7086',
    supports: '#a6e3a1',
    contradicts: '#f38ba8',
    cites: '#89b4fa',
    custom: '#cba6f7',
  }

  const labelText = $derived(data?.label ?? data?.relation ?? 'related')
  const labelColor = $derived(relationColors[data?.relation ?? 'related'])
</script>

<path id={id} class="react-flow__edge-path" d={edgePath} {markerEnd} {style} />

<EdgeLabelRenderer>
  <div
    class="edge-label"
    style="
      transform: translate(-50%,-50%) translate({labelX}px,{labelY}px);
      color: {labelColor};
    "
  >
    {labelText}
  </div>
</EdgeLabelRenderer>

<style>
  .edge-label {
    position: absolute;
    font-size: 10px;
    font-weight: 600;
    background: #1e1e2e;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #313244;
    pointer-events: none;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
</style>
```
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# All 5 files exist
ls src/lib/components/graph/nodes/
ls src/lib/components/graph/edges/
ls src/lib/components/graph/nodeTypes.ts

# TypeScript check on nodeTypes (catches component import issues early)
npx tsc --noEmit 2>&1 | grep "graph/node" | head -10
```
  </verify>

  <done>
- `nodeTypes.ts` exists at module scope with stable `nodeTypes` and `edgeTypes` objects
- `PaperNode.svelte`, `ConceptNode.svelte`, `NoteNode.svelte` all use `$props()` pattern with typed `NodeProps<T>` and `Handle` components
- `TypedEdge.svelte` renders `getBezierPath` + `EdgeLabelRenderer` with relation-colored label
- Zero TypeScript errors in these files
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 3 — GraphCanvas (sequential — needs Wave 2)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p5-t05" type="auto" wave="3" depends_on="[p5-t03, p5-t04]">
  <name>p5-t05: GraphCanvas.svelte — SvelteFlow root with controlled pattern + toolbar</name>

  <files>
    src/lib/components/graph/GraphCanvas.svelte (CREATE)
    src/lib/components/graph/GraphToolbar.svelte (CREATE)
    src/lib/components/graph/NodeEditor.svelte (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/components/graph/NodeEditor.svelte`:**

A modal/popover for creating or editing concept and note nodes:

```svelte
<script lang="ts">
  interface Props {
    mode: 'concept' | 'note'
    /** Called when user submits — parent adds node to graph */
    onsubmit: (data: { label?: string; body: string }) => void
    oncancel: () => void
  }

  let { mode, onsubmit, oncancel }: Props = $props()
  let label = $state('')
  let body = $state('')

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (mode === 'concept' && !label.trim()) return
    if (!body.trim() && mode === 'note') return
    onsubmit({ label: mode === 'concept' ? label : undefined, body })
  }
</script>

<!-- svelte-ignore a11y_click_outside -->
<div class="overlay" onclick={oncancel}>
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <h3>{mode === 'concept' ? '💡 New Concept' : '📝 New Note'}</h3>
    <form onsubmit={handleSubmit}>
      {#if mode === 'concept'}
        <label>
          Label
          <input bind:value={label} placeholder="e.g. Attention Mechanism" required autofocus />
        </label>
      {/if}
      <label>
        {mode === 'concept' ? 'Description' : 'Note content'}
        <textarea
          bind:value={body}
          placeholder={mode === 'concept' ? 'Describe the concept…' : 'Write your note…'}
          rows={4}
          autofocus={mode === 'note'}
        ></textarea>
      </label>
      <div class="actions">
        <button type="button" class="cancel" onclick={oncancel}>Cancel</button>
        <button type="submit">Add</button>
      </div>
    </form>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 12px;
    padding: 24px;
    width: 380px;
    max-width: 90vw;
  }
  h3 { margin: 0 0 16px; color: #cdd6f4; font-size: 16px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;
    font-size: 12px; color: #a6adc8; }
  input, textarea {
    background: #313244; border: 1px solid #45475a; border-radius: 6px;
    padding: 8px 10px; color: #cdd6f4; font-size: 14px; font-family: inherit;
    resize: vertical;
  }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
  button { padding: 6px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
  button[type=submit] { background: #89b4fa; color: #1e1e2e; font-weight: 600; }
  .cancel { background: #313244; color: #a6adc8; }
</style>
```

**Step 2 — Create `src/lib/components/graph/GraphToolbar.svelte`:**

Lives in a SvelteFlow `<Panel position="top-left">` inside GraphCanvas:

```svelte
<script lang="ts">
  interface Props {
    onaddconcept: () => void
    onaddnote: () => void
    onfitview: () => void
  }
  let { onaddconcept, onaddnote, onfitview }: Props = $props()
</script>

<div class="graph-toolbar">
  <button onclick={onaddconcept} title="Add concept node">💡 Concept</button>
  <button onclick={onaddnote} title="Add note node">📝 Note</button>
  <div class="sep"></div>
  <button onclick={onfitview} title="Fit all nodes into view">⊞ Fit</button>
</div>

<style>
  .graph-toolbar {
    display: flex; gap: 6px; align-items: center;
    background: rgba(30,30,46,0.9);
    border: 1px solid #45475a;
    border-radius: 8px;
    padding: 6px 8px;
    backdrop-filter: blur(4px);
  }
  button {
    background: #313244; border: none; border-radius: 6px;
    padding: 5px 10px; font-size: 12px; color: #cdd6f4;
    cursor: pointer; white-space: nowrap;
  }
  button:hover { background: #45475a; }
  .sep { width: 1px; height: 20px; background: #45475a; margin: 0 2px; }
</style>
```

**Step 3 — Create `src/lib/components/graph/GraphCanvas.svelte`:**

⚠️ **DO NOT** redefine `nodeTypes`/`edgeTypes` inside `<script>` — import from `nodeTypes.ts`.
⚠️ **USE** `$state.raw()` for nodes/edges arrays — `$state()` causes infinite re-renders.
⚠️ **ENSURE** root `<div>` has `height: 100%` — SvelteFlow sizes to container.

```svelte
<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    type Connection,
    type NodeChange,
    type EdgeChange,
  } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { useSvelteFlow } from '@xyflow/svelte'
  import { nodeTypes, edgeTypes } from './nodeTypes'
  import GraphToolbar from './GraphToolbar.svelte'
  import NodeEditor from './NodeEditor.svelte'
  import {
    graphNodes,
    graphEdges,
    graphViewport,
    persistGraph,
    addConceptNode,
    addNoteNode,
  } from '$lib/stores/graph'
  import { selectedPaperId } from '$lib/stores/papers'
  import type { GraphNode, GraphEdge } from '$lib/types/graph'

  // ── Controlled state (MUST be $state.raw — not $state) ──────────────────
  let nodes = $state.raw<GraphNode[]>([])
  let edges = $state.raw<GraphEdge[]>([])

  // Bootstrap from store on component mount
  $effect(() => {
    nodes = $graphNodes
  })
  $effect(() => {
    edges = $graphEdges
  })

  // ── SvelteFlow instance (for toObject / fitView) ─────────────────────────
  const flow = useSvelteFlow()

  // ── Node editor modal state ───────────────────────────────────────────────
  let editorMode = $state<'concept' | 'note' | null>(null)

  // ── Controlled handlers ───────────────────────────────────────────────────
  function onnodeschange(changes: NodeChange[]) {
    nodes = applyNodeChanges(changes, nodes) as GraphNode[]
    graphNodes.set(nodes)
    _persist()
  }

  function onedgeschange(changes: EdgeChange[]) {
    edges = applyEdgeChanges(changes, edges) as GraphEdge[]
    graphEdges.set(edges)
    _persist()
  }

  function onconnect(connection: Connection) {
    // Prevent duplicate edges between same pair
    const isDuplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    )
    if (isDuplicate) return

    edges = addEdge(
      { ...connection, type: 'typed', data: { relation: 'related', directed: true } },
      edges
    ) as GraphEdge[]
    graphEdges.set(edges)
    _persist()
  }

  function _persist() {
    try {
      const { viewport } = flow.toObject()
      persistGraph(viewport)
    } catch {
      // toObject may throw before SvelteFlow fully mounts — safe to ignore
      persistGraph({ x: 0, y: 0, zoom: 1 })
    }
  }

  // ── Double-click paper node → navigate to paper ───────────────────────────
  function onnodedoubleclick(_event: MouseEvent, node: GraphNode) {
    if (node.data.nodeType === 'paper') {
      selectedPaperId.set(node.data.paperId)
    }
  }

  // ── Toolbar actions ───────────────────────────────────────────────────────
  function handleFitView() {
    flow.fitView({ padding: 0.15 })
  }

  function handleAddSubmit(data: { label?: string; body: string }) {
    if (editorMode === 'concept') {
      addConceptNode(data.label ?? 'Concept', data.body)
    } else if (editorMode === 'note') {
      addNoteNode(data.body)
    }
    editorMode = null
    _persist()
  }

  // ── Connection validation ─────────────────────────────────────────────────
  function isValidConnection(connection: Connection): boolean {
    return !edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    )
  }
</script>

<!-- Root must be height: 100% — SvelteFlow sizes to container -->
<div class="canvas-root">
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    colorMode="dark"
    {onnodeschange}
    {onedgeschange}
    {onconnect}
    {onnodedoubleclick}
    {isValidConnection}
    initialViewport={$graphViewport}
    deleteKey="Backspace"
    fitView
    proOptions={{ hideAttribution: true }}
  >
    <Background />
    <Controls />
    <MiniMap nodeStrokeWidth={3} zoomable pannable />
    <Panel position="top-left">
      <GraphToolbar
        onaddconcept={() => (editorMode = 'concept')}
        onaddnote={() => (editorMode = 'note')}
        onfitview={handleFitView}
      />
    </Panel>
  </SvelteFlow>
</div>

{#if editorMode}
  <NodeEditor
    mode={editorMode}
    onsubmit={handleAddSubmit}
    oncancel={() => (editorMode = null)}
  />
{/if}

<style>
  .canvas-root {
    width: 100%;
    height: 100%;
    /* Ensure SvelteFlow's default CSS vars don't bleed into surrounding panels */
    isolation: isolate;
  }
</style>
```
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# All 3 files exist
ls src/lib/components/graph/GraphCanvas.svelte
ls src/lib/components/graph/GraphToolbar.svelte
ls src/lib/components/graph/NodeEditor.svelte

# No tsc errors in graph components
npx tsc --noEmit 2>&1 | grep "graph/" | head -20

# Confirm $state.raw usage (NOT $state()) in GraphCanvas
grep 'state\.raw' src/lib/components/graph/GraphCanvas.svelte

# Confirm nodeTypes imported from module file (not defined inline)
grep 'from.*nodeTypes' src/lib/components/graph/GraphCanvas.svelte
```
  </verify>

  <done>
- `GraphCanvas.svelte` uses `$state.raw<GraphNode[]>([])` and `$state.raw<GraphEdge[]>([])` (not `$state()`)
- `nodeTypes` and `edgeTypes` imported from `nodeTypes.ts`, not defined inside `<script>`
- Root element has `height: 100%` via `.canvas-root` class
- `deleteKey="Backspace"` enables node/edge deletion with keyboard
- `proOptions={{ hideAttribution: true }}` suppresses watermark
- `isValidConnection` prevents duplicate edges
- `onnodedoubleclick` on paper nodes sets `selectedPaperId`
- Zero TypeScript errors
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 4 — Integration (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p5-t06" type="auto" wave="4" depends_on="[p5-t05]">
  <name>p5-t06: Add Graph tab to MainPanel.svelte</name>

  <files>
    src/lib/components/layout/MainPanel.svelte (MODIFY)
  </files>

  <action>
`MainPanel.svelte` currently has three tabs: Chat, Papers, PDF. Add a fourth "🕸 Graph" tab.

**Changes to `src/lib/components/layout/MainPanel.svelte`:**

1. Add `GraphCanvas` import alongside existing imports:
```typescript
import GraphCanvas from '../graph/GraphCanvas.svelte'
```

2. Update the `activeTab` type to include `'graph'`:
```typescript
// Before:
let activeTab = $state<'chat' | 'papers' | 'pdf'>('chat')
// After:
let activeTab = $state<'chat' | 'papers' | 'pdf' | 'graph'>('chat')
```

3. Add the Graph tab button after the PDF tab button (keep existing PDF conditional logic intact):
```svelte
<button
  class="tab-btn"
  class:active={activeTab === 'graph'}
  onclick={() => (activeTab = 'graph')}
>
  🕸 Graph
</button>
```
Place this button unconditionally (unlike PDF which is conditional on `resolvedPdfPath`).

4. Add the graph content branch inside `<div class="tab-content">`:
```svelte
{:else if activeTab === 'graph'}
  <GraphCanvas />
```
Add this as the last branch before the closing `{/if}`.

5. **CRITICAL — ensure tab-content has a defined height.** SvelteFlow requires a non-zero height ancestor. Check `MainPanel.svelte`'s `.tab-content` CSS — it likely uses `flex: 1; overflow: hidden`. If so, no changes needed; the GraphCanvas `.canvas-root` with `height: 100%` will fill it. If `tab-content` doesn't have explicit height/flex, add:
```css
.tab-content {
  flex: 1;
  overflow: hidden;
  /* These two ensure SvelteFlow gets a real height */
  display: flex;
  flex-direction: column;
}
```
And add `height: 100%` to GraphCanvas's root div if not already present (it is from p5-t05).

No other changes — tab bar ordering stays as: 💬 Chat · 📄 Papers · 📖 PDF (conditional) · 🕸 Graph.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# Graph tab button present
grep "🕸" src/lib/components/layout/MainPanel.svelte

# GraphCanvas import present
grep "GraphCanvas" src/lib/components/layout/MainPanel.svelte

# activeTab type updated
grep "activeTab.*graph\|graph.*activeTab" src/lib/components/layout/MainPanel.svelte

# No tsc errors in MainPanel
npx tsc --noEmit 2>&1 | grep "MainPanel" | head -5
```
  </verify>

  <done>
- "🕸 Graph" tab button appears in the tab bar (always visible, not conditional)
- Clicking Graph tab renders `<GraphCanvas />` in the tab-content area
- `activeTab` type is `'chat' | 'papers' | 'pdf' | 'graph'`
- `GraphCanvas` is imported from `'../graph/GraphCanvas.svelte'`
- No TypeScript errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p5-t07" type="auto" wave="4" depends_on="[p5-t03, p5-t05]">
  <name>p5-t07: "Add to Graph" button on PaperDetail</name>

  <files>
    src/lib/components/PaperDetail.svelte (MODIFY)
  </files>

  <action>
Add an "Add to Graph" button on the PaperDetail panel so users can explicitly add the currently selected paper as a node.

**Changes to `src/lib/components/PaperDetail.svelte`:**

1. Add import for `ensurePaperNode` and `graphNodes`:
```typescript
import { ensurePaperNode, graphNodes } from '$lib/stores/graph'
```

2. Add a derived boolean to know if the paper is already in the graph (button becomes "In Graph ✓" if already added):
```typescript
// True if a paper node already exists for this paper
const isInGraph = $derived(
  $graphNodes.some(
    (n) => n.data.nodeType === 'paper' && (n.data as { paperId: string }).paperId === ($selectedPaper?.id ?? '')
  )
)
```

3. Add the button in the paper detail action area (near the existing Download button). The button calls `ensurePaperNode($selectedPaper)`:
```svelte
{#if $selectedPaper}
  <button
    class="add-to-graph-btn"
    disabled={isInGraph}
    onclick={() => $selectedPaper && ensurePaperNode($selectedPaper)}
  >
    {isInGraph ? '🕸 In Graph ✓' : '🕸 Add to Graph'}
  </button>
{/if}
```

4. Style (add to `<style>` block):
```css
.add-to-graph-btn {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: #cdd6f4;
  cursor: pointer;
  transition: background 0.15s;
}
.add-to-graph-btn:hover:not(:disabled) {
  background: #45475a;
}
.add-to-graph-btn:disabled {
  color: #a6e3a1;
  border-color: #a6e3a1;
  cursor: default;
  opacity: 0.8;
}
```

No other changes to PaperDetail. Do not remove or reorder existing buttons.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# Button markup present
grep "Add to Graph\|In Graph" src/lib/components/PaperDetail.svelte

# ensurePaperNode imported
grep "ensurePaperNode" src/lib/components/PaperDetail.svelte

# No tsc errors
npx tsc --noEmit 2>&1 | grep "PaperDetail" | head -5
```
  </verify>

  <done>
- "🕸 Add to Graph" button appears in PaperDetail when a paper is selected
- Clicking adds a paper node to the graph (calls `ensurePaperNode`)
- Button shows "🕸 In Graph ✓" (disabled, green border) if paper already in graph
- `$graphNodes` reactive — button state updates immediately when graph changes
- No TypeScript errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p5-t08" type="auto" wave="4" depends_on="[p5-t03, p5-t06]">
  <name>p5-t08: Initialize graph on workspace open (App.svelte integration)</name>

  <files>
    src/App.svelte (MODIFY)
  </files>

  <action>
Wire `initializeGraph()` into the app's startup flow in `App.svelte`.

**Rule:** `initializeGraph()` MUST run AFTER `papers.set(loaded)` — it needs the live papers list to filter orphaned paper nodes.

**Changes to `src/App.svelte`:**

1. Add import:
```typescript
import { initializeGraph } from '$lib/stores/graph'
```

2. Update `onMount` to call `initializeGraph()` after papers are loaded:

Current onMount (simplified):
```typescript
onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    try {
      const loaded = await loadPapers($workspace.path)
      papers.set(loaded)
    } catch (error) {
      console.error('Failed to load papers:', error)
    }
  }
})
```

Updated onMount:
```typescript
onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    try {
      const loaded = await loadPapers($workspace.path)
      papers.set(loaded)
    } catch (error) {
      console.error('Failed to load papers:', error)
    }

    // Initialize graph AFTER papers — orphan filtering requires live paper list
    try {
      await initializeGraph()
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }
})
```

That is the only change to App.svelte. The `persistGraph` debounce in the store handles all subsequent saves automatically whenever the graph changes.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# initializeGraph imported and called
grep "initializeGraph" src/App.svelte

# Called after papers.set() (check ordering in file)
grep -n "papers\.set\|initializeGraph" src/App.svelte

# No tsc errors
npx tsc --noEmit 2>&1 | grep "App\.svelte" | head -5
```
  </verify>

  <done>
- `initializeGraph()` imported and called in `App.svelte` `onMount`
- Called **after** `papers.set(loaded)` — line numbers confirm ordering
- Wrapped in try/catch with `console.error` fallback (graph failure doesn't crash app)
- `graph.json` is created on first save (after first graph change)
- On subsequent loads, graph restores exactly from disk
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 5 — Polish
     ═══════════════════════════════════════════════════════════════ -->

<task id="p5-t09" type="auto" wave="5" depends_on="[p5-t06, p5-t07, p5-t08]">
  <name>p5-t09: Polish — Delete key, edge labels, keyboard shortcuts, empty state</name>

  <files>
    src/lib/components/graph/GraphCanvas.svelte (MODIFY)
    src/lib/components/graph/nodes/PaperNode.svelte (MODIFY)
  </files>

  <action>
Final polish pass. All items below are additions/tweaks to already-created files.

**1 — Verify Delete key works (GraphCanvas.svelte)**

`deleteKey="Backspace"` was set in p5-t05. Also add `"Delete"` for Windows/Linux users:
```svelte
<SvelteFlow
  ...
  deleteKey={['Backspace', 'Delete']}
  ...
>
```
Change the `deleteKey` prop from the string `"Backspace"` to the array `['Backspace', 'Delete']`.

**2 — Edge label shows relation name (TypedEdge.svelte — already done in p5-t04)**

Verify `TypedEdge.svelte` renders the relation label. No changes needed if p5-t04 is complete — this is a confirmation step only.

**3 — Empty state message when graph has no nodes (GraphCanvas.svelte)**

Inside `GraphCanvas.svelte`, add a zero-nodes empty state as a SvelteFlow `<Panel>`:
```svelte
{#if nodes.length === 0}
  <Panel position="top-center">
    <div class="empty-hint">
      No nodes yet — use <strong>💡 Concept</strong> or <strong>📝 Note</strong> to add ideas,
      or click <strong>🕸 Add to Graph</strong> on a paper.
    </div>
  </Panel>
{/if}
```
Add CSS in `<style>`:
```css
.empty-hint {
  background: rgba(30,30,46,0.85);
  border: 1px solid #45475a;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  color: #a6adc8;
  backdrop-filter: blur(4px);
  margin-top: 16px;
  pointer-events: none;
}
```

**4 — Double-click PaperNode to also switch to Papers tab (PaperNode.svelte)**

This is already handled in GraphCanvas.svelte via `onnodedoubleclick` setting `selectedPaperId`. However, the user is on the Graph tab and may not realize navigation happened. Add a visual affordance:
In `PaperNode.svelte`, add a small "↗ Open" hint that appears on hover:
```svelte
<div class="open-hint">↗ Double-click to open</div>
```
```css
.open-hint {
  font-size: 10px;
  color: #6c7086;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.paper-node:hover .open-hint {
  opacity: 1;
}
```

**5 — Minimap node colors by type**

In `GraphCanvas.svelte`, add `nodeColor` prop to `<MiniMap>`:
```svelte
<MiniMap
  nodeStrokeWidth={3}
  zoomable
  pannable
  nodeColor={(node) => {
    const type = (node.data as { nodeType: string }).nodeType
    if (type === 'paper') return '#89b4fa'
    if (type === 'concept') return '#cba6f7'
    if (type === 'note') return '#f9e2af'
    return '#6c7086'
  }}
/>
```

**6 — Confirm SvelteFlow CSS import present**

`GraphCanvas.svelte` must have:
```typescript
import '@xyflow/svelte/dist/style.css'
```
Verify this line exists (it was added in p5-t05). If missing, add it at the top of `<script>`.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra
# deleteKey array form
grep "deleteKey" src/lib/components/graph/GraphCanvas.svelte

# Empty state Panel present
grep "empty-hint\|No nodes yet" src/lib/components/graph/GraphCanvas.svelte

# MiniMap nodeColor present
grep "nodeColor" src/lib/components/graph/GraphCanvas.svelte

# CSS import present
grep "xyflow.*style.css" src/lib/components/graph/GraphCanvas.svelte

# Full build passes
pnpm build 2>&1 | tail -20
```
  </verify>

  <done>
- `deleteKey={['Backspace', 'Delete']}` — nodes/edges deletable on both key bindings
- Empty-state hint panel visible when graph has zero nodes
- MiniMap colors nodes by type (blue=paper, purple=concept, yellow=note)
- PaperNode shows "↗ Double-click to open" on hover
- `pnpm build` succeeds with no errors
  </done>
</task>

</tasks>

---

<verification>

## Full Phase Acceptance Checklist

Run after all 9 tasks complete:

```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Install sanity
grep '"@xyflow/svelte"' package.json

# 2. Rust build
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error" | wc -l
# Expected: 0

# 3. TypeScript build
npx tsc --noEmit 2>&1 | grep -E "^src" | wc -l
# Expected: 0

# 4. Vite build
pnpm build 2>&1 | grep -E "^✓|error|Error" | head -10
# Expected: build success, no errors

# 5. File existence
ls src/lib/types/graph.ts
ls src/lib/stores/graph.ts
ls src/lib/services/graph.ts
ls src-tauri/src/commands/graph.rs
ls src/lib/components/graph/nodeTypes.ts
ls src/lib/components/graph/GraphCanvas.svelte
ls src/lib/components/graph/GraphToolbar.svelte
ls src/lib/components/graph/NodeEditor.svelte
ls src/lib/components/graph/nodes/PaperNode.svelte
ls src/lib/components/graph/nodes/ConceptNode.svelte
ls src/lib/components/graph/nodes/NoteNode.svelte
ls src/lib/components/graph/edges/TypedEdge.svelte

# 6. Critical patterns
grep 'state\.raw' src/lib/components/graph/GraphCanvas.svelte
grep 'from.*nodeTypes' src/lib/components/graph/GraphCanvas.svelte
grep 'deleteKey' src/lib/components/graph/GraphCanvas.svelte
grep 'initializeGraph' src/App.svelte
grep 'save_graph_file\|load_graph_file' src-tauri/src/lib.rs
```

## Manual Verification (run app with `pnpm tauri dev`)

1. Open the app → open a workspace with existing papers
2. Click "🕸 Graph" tab — canvas loads without blank/broken state; empty hint visible
3. Select a paper in the sidebar → click "🕸 Add to Graph" → paper node appears on canvas
4. Drag from PaperNode handle to empty space — edge handle visible; release to cancel cleanly
5. Click "💡 Concept" in toolbar → NodeEditor modal opens → fill label + body → click Add → concept node appears
6. Click "📝 Note" → fill body → note node appears
7. Drag from PaperNode bottom handle to ConceptNode top handle → edge drawn with "related" label
8. Click a node → press Backspace → node and its edges deleted
9. Press Delete on an edge → edge deleted
10. Drag nodes around to different positions
11. Close app → reopen → Graph tab shows nodes in same positions (viewport preserved)
12. Delete a paper from the papers list → reopen app → orphaned paper node is gone
13. Double-click a paper node → `selectedPaperId` updates (check Papers tab shows that paper)
</verification>

<success_criteria>

Phase 5 is complete when:

- [ ] `pnpm build` succeeds (zero errors)
- [ ] `cargo build` succeeds (zero errors)
- [ ] `npx tsc --noEmit` produces zero errors
- [ ] "🕸 Graph" tab visible in MainPanel tab bar
- [ ] GraphCanvas renders without zero-height bug (SvelteFlow visible, not collapsed)
- [ ] Paper nodes auto-added via "Add to Graph" button on PaperDetail
- [ ] Concept and Note nodes creatable via toolbar + NodeEditor modal
- [ ] Edges drawable by dragging between node Handles
- [ ] Edges have typed relation labels (default: "related")
- [ ] Duplicate edges prevented by `isValidConnection`
- [ ] Nodes/edges deletable with Backspace or Delete key
- [ ] Graph state (positions + viewport) persists to `{workspace}/graph.json`
- [ ] Graph loads correctly on app restart (orphan filtering applied)
- [ ] Double-clicking a paper node navigates to that paper via `selectedPaperId`
- [ ] MiniMap, Controls, Background all render correctly
- [ ] No SvelteFlow attribution watermark visible

</success_criteria>

<output>
After completing all tasks, create `.planning/phases/phase-5/PLAN-SUMMARY.md` with a
one-paragraph summary of what was built and any notable decisions or deviations from the plan.
</output>

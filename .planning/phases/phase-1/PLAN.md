# Phase 1: Foundation - Detailed Plan

**Phase Goal:** User can launch app, select workspace folder, and see empty but functional UI shell

**Success Criteria:**
1. User launches app on macOS/Windows/Linux and sees welcome screen
2. User selects folder via native dialog, app remembers choice
3. User sees main UI layout: left sidebar, center panel, top toolbar
4. App startup time is under 500ms on target hardware
5. Workspace folder persists across app restarts

**Phase Requirements:** SETUP-01, SETUP-02, SETUP-03

---

## Milestones

### Milestone 1: Project Scaffold (Tasks 1-3)
**Goal:** Tauri v2 + Svelte 5 + Vite project exists and builds successfully
**Deliverable:** Running hello-world Tauri app with TypeScript

### Milestone 2: Workspace Foundation (Tasks 4-6)
**Goal:** User can select and persist workspace folder
**Deliverable:** Working folder picker with persistence across restarts

### Milestone 3: UI Shell (Tasks 7-9)
**Goal:** Basic 3-panel layout renders with conditional welcome screen
**Deliverable:** Functional UI structure with navigation between welcome and main layout

### Milestone 4: Performance & Verification (Tasks 10-11)
**Goal:** Startup performance meets target, all acceptance criteria verified
**Deliverable:** Phase 1 complete, ready for Phase 2 features

---

## Tasks

### Task 1: Scaffold Tauri v2 + Svelte 5 + Vite Project

**ID:** P1-T01  
**Type:** Setup  
**Dependencies:** None  
**Estimated Effort:** 30-60 minutes

**Description:**

Run `npm create tauri-app@latest` to generate the project structure with:
- Project name: `anya-ra`
- Package manager: `npm`
- UI template: `svelte`
- TypeScript: `Yes`
- Build tool: `Vite`
- CSS: `No` (will use plain CSS)

After scaffolding:
1. Initialize git repository (if not already done)
2. Run `npm install` to install dependencies
3. Verify the scaffold works: `npm run tauri dev` should launch a hello-world window
4. Update `.gitignore` to include Tauri build artifacts

**Files Created:**
- `src/App.svelte`
- `src/main.ts`
- `src/vite-env.d.ts`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `vite.config.ts`
- `tsconfig.json`
- `package.json`

**Acceptance Criteria:**
- [ ] Project structure exists at `/Users/paul/Documents/programming/anya-ra/`
- [ ] `npm run tauri dev` launches a window successfully
- [ ] Window shows default Tauri + Svelte template
- [ ] No compilation errors in terminal
- [ ] Git repository has initial commit

---

### Task 2: Configure Tauri Window Settings

**ID:** P1-T02  
**Type:** Configuration  
**Dependencies:** P1-T01  
**Estimated Effort:** 20-30 minutes

**Description:**

Update `src-tauri/tauri.conf.json` to configure the main application window with appropriate defaults:

**Window Configuration:**
- Title: `"Anya-RA"`
- Default size: 1400x900
- Minimum size: 800x600
- Resizable: `true`
- Center window on launch: `true`
- Show title bar: `true`

**Additional Settings:**
- Remove dev tools auto-open in production
- Set app identifier: `com.anya-ra.app`
- Configure permissions for plugins (to be added in Task 3)

**Files Modified:**
- `src-tauri/tauri.conf.json`

**Acceptance Criteria:**
- [ ] Window opens at 1400x900 on first launch
- [ ] Window cannot be resized below 800x600
- [ ] Window is centered on screen
- [ ] Window title shows "Anya-RA"
- [ ] Changes persist when running `npm run tauri dev`

---

### Task 3: Install and Configure Tauri Plugins

**ID:** P1-T03  
**Type:** Setup  
**Dependencies:** P1-T02  
**Estimated Effort:** 45-60 minutes

**Description:**

Install required Tauri v2 plugins for Phase 1 functionality:

**Plugins to Install:**
1. `tauri-plugin-store` — Persistent key-value storage for workspace path
2. `tauri-plugin-dialog` — Native folder picker dialog
3. `tauri-plugin-fs` — File system operations (scoped access)

**Installation Steps:**

1. Add to `src-tauri/Cargo.toml` dependencies:
```toml
[dependencies]
tauri-plugin-store = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
```

2. Initialize plugins in `src-tauri/src/main.rs`:
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. Install frontend dependencies:
```bash
npm install @tauri-apps/api @tauri-apps/plugin-store @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
```

4. Update `tauri.conf.json` to configure file system scopes:
```json
{
  "plugins": {
    "fs": {
      "scope": ["$APPDATA/**"]
    }
  }
}
```

**Files Modified:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `package.json`
- `src-tauri/tauri.conf.json`

**Acceptance Criteria:**
- [ ] `cargo build` completes successfully
- [ ] Plugins are imported without errors
- [ ] Application launches with plugins initialized
- [ ] No runtime errors in console

---

### Task 4: Define Workspace Data Model

**ID:** P1-T04  
**Type:** Implementation  
**Dependencies:** P1-T03  
**Estimated Effort:** 30-45 minutes

**Description:**

Create TypeScript interfaces and Rust structs for the workspace data model. This establishes the contract for workspace persistence.

**Workspace Schema:**
```typescript
interface Workspace {
  path: string;          // Absolute path to workspace folder
  name: string;          // Display name (derived from folder name)
  createdAt: string;     // ISO 8601 timestamp
  lastOpened: string;    // ISO 8601 timestamp
}
```

**Implementation:**

1. Create `src/lib/types/workspace.ts`:
```typescript
export interface Workspace {
  path: string
  name: string
  createdAt: string
  lastOpened: string
}

export interface WorkspaceState {
  current: Workspace | null
  hasWorkspace: boolean
}
```

2. Create `src-tauri/src/types.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub path: String,
    pub name: String,
    pub created_at: String,
    pub last_opened: String,
}
```

3. Add module to `src-tauri/src/lib.rs`:
```rust
pub mod types;
```

**Files Created:**
- `src/lib/types/workspace.ts`
- `src-tauri/src/types.rs`

**Files Modified:**
- `src-tauri/src/lib.rs`

**Acceptance Criteria:**
- [ ] TypeScript interface compiles without errors
- [ ] Rust struct compiles without errors
- [ ] Types are exported and accessible
- [ ] Both frontend and backend have matching data structure

---

### Task 5: Implement Workspace Selection (Backend)

**ID:** P1-T05  
**Type:** Implementation  
**Dependencies:** P1-T04  
**Estimated Effort:** 1-2 hours

**Description:**

Create Rust commands for workspace folder selection and persistence using tauri-plugin-store and tauri-plugin-dialog.

**Commands to Implement:**

1. `pick_folder()` — Open native folder picker dialog
2. `save_workspace(workspace: Workspace)` — Save workspace to store
3. `load_workspace()` — Load workspace from store
4. `get_app_data_dir()` — Get app data directory path

**Implementation:**

1. Create `src-tauri/src/commands/workspace.rs`:
```rust
use tauri::{AppHandle, command};
use tauri_plugin_store::StoreExt;
use crate::types::Workspace;
use chrono::Utc;

#[command]
pub async fn pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    
    let folder = app.dialog()
        .file()
        .blocking_pick_folder();
    
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[command]
pub async fn save_workspace(app: AppHandle, workspace: Workspace) -> Result<(), String> {
    let store = app.store("workspace.json").map_err(|e| e.to_string())?;
    store.set("workspace", serde_json::to_value(&workspace).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn load_workspace(app: AppHandle) -> Result<Option<Workspace>, String> {
    let store = app.store("workspace.json").map_err(|e| e.to_string())?;
    
    match store.get("workspace") {
        Some(value) => {
            let ws: Workspace = serde_json::from_value(value.clone())
                .map_err(|e| e.to_string())?;
            Ok(Some(ws))
        },
        None => Ok(None)
    }
}

#[command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
```

2. Create `src-tauri/src/commands/mod.rs`:
```rust
pub mod workspace;
```

3. Register commands in `src-tauri/src/main.rs`:
```rust
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::pick_folder,
            commands::workspace::save_workspace,
            commands::workspace::load_workspace,
            commands::workspace::get_app_data_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

4. Add `chrono` dependency to `Cargo.toml` for timestamps:
```toml
chrono = { version = "0.4", features = ["serde"] }
```

**Files Created:**
- `src-tauri/src/commands/workspace.rs`
- `src-tauri/src/commands/mod.rs`

**Files Modified:**
- `src-tauri/src/main.rs`
- `src-tauri/src/Cargo.toml`

**Acceptance Criteria:**
- [ ] `cargo build` compiles successfully
- [ ] Commands are registered without errors
- [ ] All four commands are accessible from frontend

---

### Task 6: Implement Workspace Selection (Frontend)

**ID:** P1-T06  
**Type:** Implementation  
**Dependencies:** P1-T05  
**Estimated Effort:** 1-2 hours

**Description:**

Create TypeScript service layer to wrap Tauri commands and implement workspace selection logic in Svelte.

**Implementation:**

1. Create `src/lib/services/workspace.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core'
import type { Workspace } from '../types/workspace'

export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>('pick_folder')
}

export async function loadWorkspace(): Promise<Workspace | null> {
  return invoke<Workspace | null>('load_workspace')
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  return invoke<void>('save_workspace', { workspace })
}

export async function getAppDataDir(): Promise<string> {
  return invoke<string>('get_app_data_dir')
}

export async function createWorkspace(folderPath: string): Promise<Workspace> {
  const folderName = folderPath.split('/').pop() || 'Unnamed Workspace'
  const now = new Date().toISOString()
  
  const workspace: Workspace = {
    path: folderPath,
    name: folderName,
    createdAt: now,
    lastOpened: now
  }
  
  await saveWorkspace(workspace)
  return workspace
}
```

2. Create workspace store at `src/lib/stores/workspace.ts`:
```typescript
import { writable, derived } from 'svelte/store'
import type { Workspace } from '../types/workspace'
import { loadWorkspace as loadWorkspaceFromBackend } from '../services/workspace'

export const workspace = writable<Workspace | null>(null)

export const hasWorkspace = derived(
  workspace,
  $workspace => $workspace !== null
)

export async function initializeWorkspace() {
  const ws = await loadWorkspaceFromBackend()
  workspace.set(ws)
}
```

3. Test in `src/App.svelte` by temporarily adding a button to test folder picker:
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { workspace, initializeWorkspace } from './lib/stores/workspace'
  import { pickFolder, createWorkspace } from './lib/services/workspace'
  
  onMount(async () => {
    await initializeWorkspace()
  })
  
  async function selectFolder() {
    const path = await pickFolder()
    if (path) {
      const ws = await createWorkspace(path)
      workspace.set(ws)
      console.log('Workspace created:', ws)
    }
  }
</script>

<main>
  <h1>Anya-RA</h1>
  <button on:click={selectFolder}>Select Workspace Folder</button>
  {#if $workspace}
    <p>Current workspace: {$workspace.path}</p>
  {/if}
</main>
```

**Files Created:**
- `src/lib/services/workspace.ts`
- `src/lib/stores/workspace.ts`

**Files Modified:**
- `src/App.svelte` (temporarily for testing)

**Acceptance Criteria:**
- [ ] Click button opens native folder picker dialog
- [ ] Selecting folder creates and saves workspace
- [ ] Workspace appears in console log
- [ ] Restarting app loads saved workspace (check console on mount)
- [ ] All TypeScript compiles without errors

---

### Task 7: Create Welcome Screen Component

**ID:** P1-T07  
**Type:** Implementation  
**Dependencies:** P1-T06  
**Estimated Effort:** 45-60 minutes

**Description:**

Build the welcome screen that appears when no workspace is selected. This is the user's first interaction with the app.

**Design:**
- Centered content
- App title/logo
- Brief description (1-2 sentences)
- Primary CTA button: "Select Workspace Folder"
- Minimalist styling (black text on white background for light mode)

**Implementation:**

Create `src/lib/components/WelcomeScreen.svelte`:
```svelte
<script lang="ts">
  import { workspace } from '../stores/workspace'
  import { pickFolder, createWorkspace } from '../services/workspace'
  
  let isSelecting = false
  let errorMessage = ''
  
  async function selectWorkspaceFolder() {
    isSelecting = true
    errorMessage = ''
    
    try {
      const path = await pickFolder()
      
      if (path) {
        const ws = await createWorkspace(path)
        workspace.set(ws)
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to select folder'
      console.error('Workspace selection error:', error)
    } finally {
      isSelecting = false
    }
  }
</script>

<div class="welcome-screen">
  <div class="content">
    <h1>Anya-RA</h1>
    <p class="tagline">Your research assistant for papers, annotations, and writing.</p>
    
    <button 
      class="primary-button" 
      on:click={selectWorkspaceFolder}
      disabled={isSelecting}
    >
      {isSelecting ? 'Opening...' : 'Select Workspace Folder'}
    </button>
    
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
    
    <p class="hint">Choose a folder where your research files will be stored.</p>
  </div>
</div>

<style>
  .welcome-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: #ffffff;
  }
  
  .content {
    text-align: center;
    max-width: 500px;
    padding: 2rem;
  }
  
  h1 {
    font-size: 3rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: #000000;
  }
  
  .tagline {
    font-size: 1.125rem;
    color: #555555;
    margin: 0 0 2rem 0;
    line-height: 1.6;
  }
  
  .primary-button {
    background: #000000;
    color: #ffffff;
    border: none;
    padding: 0.875rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .primary-button:hover:not(:disabled) {
    background: #333333;
  }
  
  .primary-button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .hint {
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #888888;
  }
  
  .error {
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 1rem;
  }
</style>
```

**Files Created:**
- `src/lib/components/WelcomeScreen.svelte`

**Acceptance Criteria:**
- [ ] Welcome screen renders centered on page
- [ ] Button is styled and interactive
- [ ] Clicking button opens folder picker
- [ ] Error message displays if selection fails
- [ ] Button shows loading state during selection

---

### Task 8: Create Main Layout Components

**ID:** P1-T08  
**Type:** Implementation  
**Dependencies:** P1-T06  
**Estimated Effort:** 1.5-2 hours

**Description:**

Build the 3-panel layout structure that displays after workspace selection: toolbar (top), sidebar (left), main panel (center).

**Layout Structure:**
```
┌──────────────────────────────────────────┐
│          Toolbar (48px height)           │
├──────────┬───────────────────────────────┤
│          │                               │
│ Sidebar  │       Main Panel              │
│ (280px)  │       (flex: 1)               │
│          │                               │
│          │                               │
└──────────┴───────────────────────────────┘
```

**Implementation:**

1. Create `src/lib/components/Toolbar.svelte`:
```svelte
<script lang="ts">
  import { workspace } from '../stores/workspace'
</script>

<div class="toolbar">
  <div class="left">
    <h2 class="workspace-name">{$workspace?.name || 'Anya-RA'}</h2>
  </div>
  <div class="right">
    <span class="placeholder">Phase 1</span>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 1rem;
    border-bottom: 1px solid #e0e0e0;
    background: #ffffff;
  }
  
  .left {
    display: flex;
    align-items: center;
  }
  
  .workspace-name {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #000000;
  }
  
  .right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .placeholder {
    font-size: 0.875rem;
    color: #888888;
  }
</style>
```

2. Create `src/lib/components/Sidebar.svelte`:
```svelte
<script lang="ts">
  // Placeholder for Phase 2: Paper list will go here
</script>

<div class="sidebar">
  <div class="section">
    <h3>Papers</h3>
    <p class="empty-state">No papers yet</p>
  </div>
  
  <div class="section">
    <h3>Notes</h3>
    <p class="empty-state">No notes yet</p>
  </div>
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 1.5rem;
  }
  
  .section h3 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666666;
    margin: 0 0 0.5rem 0;
  }
  
  .empty-state {
    font-size: 0.875rem;
    color: #999999;
    font-style: italic;
    margin: 0;
  }
</style>
```

3. Create `src/lib/components/MainPanel.svelte`:
```svelte
<script lang="ts">
  // Placeholder for Phase 2+: Content will go here
</script>

<div class="main-panel">
  <div class="empty-state">
    <h2>Welcome to Anya-RA</h2>
    <p>Your workspace is ready. Features will be added in upcoming phases.</p>
  </div>
</div>

<style>
  .main-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #fafafa;
  }
  
  .empty-state {
    text-align: center;
    max-width: 500px;
    padding: 2rem;
  }
  
  .empty-state h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #000000;
    margin: 0 0 0.5rem 0;
  }
  
  .empty-state p {
    font-size: 1rem;
    color: #666666;
    line-height: 1.6;
    margin: 0;
  }
</style>
```

4. Create `src/lib/components/MainLayout.svelte`:
```svelte
<script lang="ts">
  import Toolbar from './Toolbar.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPanel from './MainPanel.svelte'
</script>

<div class="main-layout">
  <Toolbar />
  <div class="content">
    <aside class="sidebar-container">
      <Sidebar />
    </aside>
    <main class="main-panel-container">
      <MainPanel />
    </main>
  </div>
</div>

<style>
  .main-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
  
  .content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .sidebar-container {
    width: 280px;
    border-right: 1px solid #e0e0e0;
    background: #ffffff;
    overflow-y: auto;
  }
  
  .main-panel-container {
    flex: 1;
    overflow-y: auto;
  }
</style>
```

**Files Created:**
- `src/lib/components/Toolbar.svelte`
- `src/lib/components/Sidebar.svelte`
- `src/lib/components/MainPanel.svelte`
- `src/lib/components/MainLayout.svelte`

**Acceptance Criteria:**
- [ ] Layout renders with correct structure (toolbar, sidebar, main)
- [ ] Sidebar is fixed at 280px width
- [ ] Main panel fills remaining space
- [ ] Toolbar displays workspace name
- [ ] Components are styled consistently
- [ ] No overflow issues or scrollbar artifacts

---

### Task 9: Wire App Navigation and Conditional Rendering

**ID:** P1-T09  
**Type:** Implementation  
**Dependencies:** P1-T07, P1-T08  
**Estimated Effort:** 30-45 minutes

**Description:**

Update `src/App.svelte` to conditionally render WelcomeScreen or MainLayout based on workspace state. This completes the Phase 1 UI flow.

**Implementation:**

Replace `src/App.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { workspace, hasWorkspace, initializeWorkspace } from './lib/stores/workspace'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import MainLayout from './lib/components/MainLayout.svelte'
  
  let isLoading = true
  
  onMount(async () => {
    await initializeWorkspace()
    isLoading = false
  })
</script>

{#if isLoading}
  <div class="loading">
    <p>Loading...</p>
  </div>
{:else if $hasWorkspace}
  <MainLayout />
{:else}
  <WelcomeScreen />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    background: #ffffff;
  }
  
  .loading p {
    font-size: 1rem;
    color: #666666;
  }
</style>
```

**Files Modified:**
- `src/App.svelte`

**Acceptance Criteria:**
- [ ] App shows loading state briefly on startup
- [ ] Welcome screen appears if no workspace exists
- [ ] Main layout appears if workspace exists
- [ ] Selecting workspace transitions from Welcome to Main Layout
- [ ] Restarting app remembers workspace and shows Main Layout

---

### Task 10: Optimize Build Configuration for Performance

**ID:** P1-T10  
**Type:** Optimization  
**Dependencies:** P1-T09  
**Estimated Effort:** 45-60 minutes

**Description:**

Configure Tauri and Vite for optimal startup performance to meet the <500ms target.

**Optimizations:**

1. Update `src-tauri/Cargo.toml` release profile:
```toml
[profile.release]
lto = true              # Link-time optimization
strip = true            # Strip debug symbols
opt-level = "z"         # Optimize for size
codegen-units = 1       # Single codegen unit for better optimization
panic = "abort"         # Smaller binary
```

2. Update `vite.config.ts` for code splitting:
```typescript
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          svelte: ['svelte'],
        }
      }
    }
  },
  
  optimizeDeps: {
    include: ['@tauri-apps/api', '@tauri-apps/plugin-store', '@tauri-apps/plugin-dialog']
  }
})
```

3. Create a startup performance measurement script at `scripts/measure-startup.sh`:
```bash
#!/bin/bash

echo "Building release binary..."
npm run tauri build

echo ""
echo "Measuring cold startup time (5 runs)..."

for i in {1..5}; do
  echo "Run $i:"
  time ./src-tauri/target/release/anya-ra &
  PID=$!
  sleep 2
  kill $PID 2>/dev/null
  sleep 1
done
```

4. Make script executable and document usage in README:
```bash
chmod +x scripts/measure-startup.sh
```

**Files Created:**
- `scripts/measure-startup.sh`

**Files Modified:**
- `src-tauri/Cargo.toml`
- `vite.config.ts`

**Acceptance Criteria:**
- [ ] Release build completes successfully
- [ ] Binary size is under 10MB (macOS/Linux) or 15MB (Windows)
- [ ] Startup time is measured and documented
- [ ] Cold start time is under 500ms on development machine
- [ ] No regression in functionality after optimization

---

### Task 11: Comprehensive Phase 1 Verification

**ID:** P1-T11  
**Type:** Testing & Verification  
**Dependencies:** P1-T10  
**Estimated Effort:** 1-1.5 hours

**Description:**

Perform end-to-end verification of all Phase 1 success criteria and document any issues.

**Verification Checklist:**

**1. Cross-Platform Launch (Manual Testing):**
- [ ] macOS: Build and launch app (`npm run tauri build`)
- [ ] Windows: Build and launch (if available)
- [ ] Linux: Build and launch (if available)
- [ ] Document any platform-specific issues

**2. Workspace Selection:**
- [ ] Launch app with no workspace → Welcome screen appears
- [ ] Click "Select Workspace Folder" → Native dialog opens
- [ ] Select folder → Dialog closes, Main Layout appears
- [ ] Check console → Workspace object logged correctly
- [ ] Verify workspace.json created in app data dir

**3. Workspace Persistence:**
- [ ] Close app completely
- [ ] Relaunch app → Main Layout appears immediately (no Welcome screen)
- [ ] Check console → Workspace loaded on mount
- [ ] Verify `lastOpened` timestamp updated

**4. UI Layout:**
- [ ] Toolbar shows workspace name
- [ ] Sidebar is 280px wide with sections
- [ ] Main panel fills remaining space
- [ ] Window is resizable but not below 800x600
- [ ] Layout is responsive to window resizing

**5. Performance:**
- [ ] Run `scripts/measure-startup.sh`
- [ ] Document average startup time
- [ ] If >500ms, identify bottleneck (binary size, plugin init, etc.)
- [ ] Optimize if necessary

**6. Error Handling:**
- [ ] Cancel folder selection → No error, stay on Welcome screen
- [ ] Select invalid path (if possible) → Error message displays
- [ ] Close app during workspace save → Data integrity maintained

**Testing Documentation:**

Create `PHASE_1_TEST_RESULTS.md` in `.planning/phases/phase-1/` with results:
```markdown
# Phase 1 Test Results

**Test Date:** [Date]
**Tester:** [Name]
**Platform:** [macOS/Windows/Linux]

## Success Criteria Verification

### 1. Cross-Platform Launch
- [x] macOS: ✓ Launches successfully
- [ ] Windows: Not tested
- [ ] Linux: Not tested

### 2. Workspace Selection
- [x] Welcome screen appears on first launch
- [x] Folder picker opens
- [x] Workspace saves correctly

### 3. Workspace Persistence
- [x] Workspace loads on restart
- [x] Last opened timestamp updates

### 4. UI Layout
- [x] 3-panel layout renders correctly
- [x] Sidebar fixed at 280px
- [x] Toolbar displays workspace name

### 5. Performance
- Startup time (average of 5 runs): [X]ms
- [x] Meets <500ms target

## Issues Found

[List any bugs or issues discovered]

## Recommendations

[Any suggestions for Phase 2]
```

**Files Created:**
- `.planning/phases/phase-1/PHASE_1_TEST_RESULTS.md`

**Acceptance Criteria:**
- [ ] All 5 success criteria from Phase 1 goal are verified
- [ ] Test results documented in PHASE_1_TEST_RESULTS.md
- [ ] Any critical issues are logged
- [ ] Performance measurements recorded
- [ ] Phase 1 is ready for Phase 2 development

---

## Task Dependencies Diagram

```
Milestone 1: Project Scaffold
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Task 1  │────▶│ Task 2  │────▶│ Task 3  │
│ Scaffold│     │Configure│     │ Plugins │
└─────────┘     └─────────┘     └─────────┘
                                      │
                                      ▼
Milestone 2: Workspace Foundation
                                ┌─────────┐
                                │ Task 4  │
                                │  Types  │
                                └─────────┘
                                      │
                    ┌─────────────────┴────────────┐
                    ▼                              ▼
              ┌─────────┐                    ┌─────────┐
              │ Task 5  │                    │ Task 6  │
              │Backend  │                    │Frontend │
              └─────────┘                    └─────────┘
                    │                              │
                    └───────────┬──────────────────┘
                                ▼
Milestone 3: UI Shell
                          ┌─────────┐
                          │ Task 7  │
                          │ Welcome │
                          └─────────┘
                                │
                          ┌─────────┐
                          │ Task 8  │
                          │ Layout  │
                          └─────────┘
                                │
                          ┌─────────┐
                          │ Task 9  │
                          │  Wire   │
                          └─────────┘
                                │
Milestone 4: Performance & Verification
                                │
                          ┌─────────┐
                          │ Task 10 │
                          │Optimize │
                          └─────────┘
                                │
                          ┌─────────┐
                          │ Task 11 │
                          │ Verify  │
                          └─────────┘
```

## Estimated Timeline

| Task | Effort | Cumulative |
|------|--------|------------|
| T01: Scaffold | 30-60 min | 1h |
| T02: Configure Window | 20-30 min | 1.5h |
| T03: Install Plugins | 45-60 min | 2.5h |
| T04: Data Model | 30-45 min | 3h |
| T05: Backend Workspace | 1-2h | 5h |
| T06: Frontend Workspace | 1-2h | 7h |
| T07: Welcome Screen | 45-60 min | 8h |
| T08: Main Layout | 1.5-2h | 10h |
| T09: Wire Navigation | 30-45 min | 10.5h |
| T10: Optimize | 45-60 min | 11.5h |
| T11: Verify | 1-1.5h | 13h |

**Total Estimated Effort:** 11-13 hours (1.5-2 developer days)

---

## Success Criteria Summary

**Phase 1 is complete when:**

✅ **Criterion 1:** User launches app on macOS/Windows/Linux and sees welcome screen
- Verified by: Task 11 cross-platform testing

✅ **Criterion 2:** User selects folder via native dialog, app remembers choice
- Verified by: Task 11 workspace selection testing

✅ **Criterion 3:** User sees main UI layout: left sidebar, center panel, top toolbar
- Verified by: Task 11 UI layout testing

✅ **Criterion 4:** App startup time is under 500ms
- Verified by: Task 10 performance measurements

✅ **Criterion 5:** Workspace folder persists across app restarts
- Verified by: Task 11 persistence testing

---

## Next Phase

After Phase 1 completion, proceed to **Phase 2: Paper Management** which will add:
- Paper discovery APIs (arXiv, Semantic Scholar, PubMed)
- Local PDF import functionality
- Paper list UI in sidebar
- Paper metadata storage

Phase 1 provides the foundation that Phase 2 will build upon.

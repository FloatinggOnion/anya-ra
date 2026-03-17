import { writable, derived, get } from "svelte/store";
import type { UILayout, MovableTab, PanelId } from "../types/ui-layout";
import { DEFAULT_LAYOUT } from "../types/ui-layout";
import { loadUILayout, saveUILayout } from "../services/ui-layout";

// ─── Public state ─────────────────────────────────────────────────────────────

export type { MovableTab, PanelId };

export const tabLabels: Record<MovableTab, string> = {
    chat: "💬 Chat",
    papers: "📄 Papers",
    pdf: "📖 PDF",
    notes: "📝 Notes",
    graph: "🕸 Graph",
};

// Ordered list of all tabs — defines display order within a column
const TAB_ORDER: MovableTab[] = ["papers", "pdf", "notes", "chat", "graph"];

// ─── Internal stores ──────────────────────────────────────────────────────────

/** Which panel each tab belongs to */
export const tabPlacement = writable<Record<MovableTab, PanelId>>({
    papers: "center",
    pdf: "center",
    notes: "center",
    chat: "right",
    graph: "right",
});

export const activeCenterTab = writable<MovableTab>("papers");
export const activeRightTab = writable<MovableTab>("chat");
export const centerCollapsed = writable<boolean>(false);
export const rightCollapsed = writable<boolean>(false);

// ─── Derived ──────────────────────────────────────────────────────────────────

export const centerTabs = derived(tabPlacement, ($p) =>
    TAB_ORDER.filter((t) => $p[t] === "center"),
);

export const rightTabs = derived(tabPlacement, ($p) =>
    TAB_ORDER.filter((t) => $p[t] === "right"),
);

// ─── Init / persist ───────────────────────────────────────────────────────────

let _workspacePath: string | null = null;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
    if (!_workspacePath) return;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        persistLayout();
    }, 500);
}

async function persistLayout() {
    if (!_workspacePath) return;
    const layout: UILayout = {
        version: 1,
        centerTabs: get(centerTabs),
        rightTabs: get(rightTabs),
        activeCenterTab: get(activeCenterTab),
        activeRightTab: get(activeRightTab),
        centerCollapsed: get(centerCollapsed),
        rightCollapsed: get(rightCollapsed),
    };
    try {
        await saveUILayout(_workspacePath, layout);
    } catch (err) {
        console.error("[panel-layout] Failed to persist layout:", err);
    }
}

export async function initPanelLayout(workspacePath: string) {
    _workspacePath = workspacePath;
    const layout = await loadUILayout(workspacePath);

    // Validate tab lists — ensure every MovableTab appears exactly once
    const allTabs: MovableTab[] = ["papers", "pdf", "notes", "chat", "graph"];
    const seenCenter = new Set(
        layout.centerTabs.filter((t) => allTabs.includes(t)),
    );
    const seenRight = new Set(
        layout.rightTabs.filter((t) => allTabs.includes(t)),
    );

    // Tabs missing from persisted lists get default placement
    const placement: Record<MovableTab, PanelId> = {} as Record<
        MovableTab,
        PanelId
    >;
    for (const tab of allTabs) {
        if (seenCenter.has(tab)) placement[tab] = "center";
        else if (seenRight.has(tab)) placement[tab] = "right";
        else {
            const defaultPanel = DEFAULT_LAYOUT.centerTabs.includes(tab)
                ? "center"
                : "right";
            placement[tab] = defaultPanel;
        }
    }

    tabPlacement.set(placement);

    // Validate active tabs exist in their columns
    const resolvedCenter = TAB_ORDER.filter((t) => placement[t] === "center");
    const resolvedRight = TAB_ORDER.filter((t) => placement[t] === "right");

    activeCenterTab.set(
        resolvedCenter.includes(layout.activeCenterTab)
            ? layout.activeCenterTab
            : (resolvedCenter[0] ?? "papers"),
    );
    activeRightTab.set(
        resolvedRight.includes(layout.activeRightTab)
            ? layout.activeRightTab
            : (resolvedRight[0] ?? "chat"),
    );

    centerCollapsed.set(layout.centerCollapsed ?? false);
    rightCollapsed.set(layout.rightCollapsed ?? false);

    // Subscribe to changes and auto-persist
    tabPlacement.subscribe(scheduleSave);
    activeCenterTab.subscribe(scheduleSave);
    activeRightTab.subscribe(scheduleSave);
    centerCollapsed.subscribe(scheduleSave);
    rightCollapsed.subscribe(scheduleSave);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Move a tab from its current column to the other column.
 * Refuses if doing so would leave the source column empty.
 */
export function moveTab(tab: MovableTab, toPanel: PanelId) {
    const placement = get(tabPlacement);
    const fromPanel = placement[tab];
    if (fromPanel === toPanel) return;

    const fromCount = Object.values(placement).filter(
        (p) => p === fromPanel,
    ).length;
    if (fromCount <= 1) return; // refuse to empty a column

    tabPlacement.update((prev) => ({ ...prev, [tab]: toPanel }));

    // If the moved tab was active in the source column, activate the next tab there
    if (fromPanel === "center" && get(activeCenterTab) === tab) {
        const remaining = get(centerTabs);
        if (remaining.length > 0) activeCenterTab.set(remaining[0]);
    } else if (fromPanel === "right" && get(activeRightTab) === tab) {
        const remaining = get(rightTabs);
        if (remaining.length > 0) activeRightTab.set(remaining[0]);
    }

    // Activate the tab in its new column
    if (toPanel === "center") activeCenterTab.set(tab);
    else activeRightTab.set(tab);
}

/**
 * Set the active tab in whichever column the tab belongs to.
 */
export function activateTab(tab: MovableTab) {
    const panel = get(tabPlacement)[tab];
    if (panel === "center") activeCenterTab.set(tab);
    else activeRightTab.set(tab);
}

export function toggleCollapse(panel: PanelId) {
    if (panel === "center") centerCollapsed.update((v) => !v);
    else rightCollapsed.update((v) => !v);
}

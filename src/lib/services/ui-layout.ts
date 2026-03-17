import { invoke } from "@tauri-apps/api/core";
import type { UILayout } from "../types/ui-layout";
import { DEFAULT_LAYOUT } from "../types/ui-layout";

export async function loadUILayout(workspacePath: string): Promise<UILayout> {
    try {
        const json = await invoke<string | null>("load_ui_layout_file", {
            workspacePath,
        });
        if (!json) return { ...DEFAULT_LAYOUT };
        const parsed = JSON.parse(json) as UILayout;
        if (parsed.version !== 1) {
            console.warn("[ui-layout] Unknown version, using defaults");
            return { ...DEFAULT_LAYOUT };
        }
        // Merge defaults to guard against missing fields added in future versions
        return { ...DEFAULT_LAYOUT, ...parsed };
    } catch {
        return { ...DEFAULT_LAYOUT };
    }
}

export async function saveUILayout(
    workspacePath: string,
    layout: UILayout,
): Promise<void> {
    const content = JSON.stringify(layout, null, 2);
    await invoke<void>("save_ui_layout_file", { workspacePath, content });
}

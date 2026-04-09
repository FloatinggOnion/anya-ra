export type MovableTab = "chat" | "papers" | "pdf" | "notes" | "document" | "graph";
export type PanelId = "center" | "right";

export interface UILayout {
    version: 1;
    centerTabs: MovableTab[];
    rightTabs: MovableTab[];
    activeCenterTab: MovableTab;
    activeRightTab: MovableTab;
    centerCollapsed: boolean;
    rightCollapsed: boolean;
}

export const DEFAULT_LAYOUT: UILayout = {
    version: 1,
    centerTabs: ["papers", "pdf", "notes", "document"],
    rightTabs: ["chat", "graph"],
    activeCenterTab: "papers",
    activeRightTab: "chat",
    centerCollapsed: false,
    rightCollapsed: false,
};

/** The page settings that live in `page.other` (not in the blocks): saved with the page, never on their own. */
export type DocsPageDraft = { description: string; hidden: boolean };

/** The right panel's tabs. `block` only exists while a block is picked. */
export type DocsPanelTab = "page" | "docs" | "block";

/** The sections of the Docs tab. A click on the canvas's top bar opens Header. */
export type DocsSection = "header" | "search" | "features" | "address";

/** The left rail's tabs: the docs' pages, the blocks to add, and the assistant. */
export type DocsRailTab = "pages" | "blocks" | "assistant";

/** The page's own switches for the parts around its text (a part also needs the docs-wide switch on). */
export type DocsPageToggles = { showToc: boolean; showPrevNext: boolean; copyPage: boolean };
export type DocsPageToggleKey = keyof DocsPageToggles;

/** Where the canvas was clicked in the frame: the top bar opens Docs → Header, the sidebar shows the Pages tab. */
export type DocsFrameRegion = "header" | "sidebar";

/** What the page switcher and the editor header show about the page being edited. */
export type DocsPageMeta = { title: string; slug: string; status: string; version: number };

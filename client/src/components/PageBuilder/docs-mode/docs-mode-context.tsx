import { createContext, useContext, type MutableRefObject } from "react";
import type { DocsSettings, DocsTree, UpdateDocsSettingsInput } from "@shared/docs";
import type { BlockConfig } from "@shared/schema-types";
import type { DropResult } from "@/lib/dnd";
import type { DocsEditorState } from "./docs-editor-state";
import type { DocsPageMeta, DocsPageToggleKey, DocsPageToggles, DocsPanelTab, DocsRailTab, DocsSection } from "./docs-types";

/**
 * How the navigation list and the page builder share one drag and drop. The builder owns the
 * drag; the list, when it is on screen, says "that one was mine" so the canvas never sees it.
 */
export type DocsDragBridge = {
	/** Takes a finished drag when it came from the navigation list; true when it did. */
	handleDrop: ((result: DropResult) => boolean) | null;
	/** The title shown next to the pointer while a row of the list is dragged. */
	describe: ((id: string) => string | null) | null;
};

/** The right panel's state: which tab shows and which section of the Docs tab is open (one at a time). */
export type DocsPanel = {
	tab: DocsPanelTab;
	setTab: (tab: DocsPanelTab) => void;
	section: DocsSection | null;
	setSection: (section: DocsSection | null) => void;
	/** Shows the Docs tab with one section open. */
	openSection: (section: DocsSection) => void;
};

/** The left rail's tab: Pages, Blocks or Assistant. */
export type DocsRail = {
	tab: DocsRailTab;
	/** Counts every `setTab`, even to the tab already open, so the phone rail (one rail for both sides) can show it again. */
	shown: number;
	setTab: (tab: DocsRailTab) => void;
};

/**
 * Everything the docs editor's screens read, in one place: the page being edited, the docs it sits
 * in and what is picked. Built once by `DocsModeProvider`, so the panels, the page switcher and the
 * other screens all see the same copy and none of them reach into the page builder.
 */
export type DocsModeValue = {
	pageId: string;
	siteId: string;
	editor: DocsEditorState;

	/** The page being edited, as the header and Page tab show it (unsaved edits included). */
	meta: DocsPageMeta;
	setMeta: (patch: Partial<Pick<DocsPageMeta, "title" | "slug" | "status">>) => void;
	blocks: BlockConfig[];
	/** The docs page block (the column that takes blocks); null while the frame is missing. */
	docsPage: BlockConfig | null;
	toggles: DocsPageToggles;
	setToggle: (key: DocsPageToggleKey, on: boolean) => void;

	/** The docs this page sits in. */
	tree: DocsTree | null;
	treeLoading: boolean;
	treeFailed: boolean;
	homeId: string;
	isHome: boolean;
	/** The start of this page's address: its parent's address and a closing slash (`/docs/guides/`). */
	addressPrefix: string;
	/** The docs-wide settings: this page's own copy on the docs home (saved with it), the server's everywhere else. */
	settings: DocsSettings | null;
	/** Changes the docs-wide settings; false when the server refused (already told in plain words). */
	saveSettings: (patch: UpdateDocsSettingsInput) => Promise<boolean>;
	refreshTree: () => Promise<void>;
	/** After the server changed this page's own row (moved, renamed, hidden): takes its new version so the next Save isn't refused. */
	syncAfterServerChange: () => Promise<void>;

	panel: DocsPanel;
	rail: DocsRail;
	/** Opens another page of these docs in the editor (this page's changes are kept as a draft, as for any page you leave). */
	openPage: (pageId: string) => void;
	dragBridge: MutableRefObject<DocsDragBridge>;
	selectedBlock: BlockConfig | null;
	selectBlock: (id: string | null) => void;
	/** Adds a block of this kind to the docs page: after the picked block, else at the end. */
	insertBlock: (name: string) => void;
	/** Puts new blocks in as the page's content and returns the page's whole tree as it now is. `newStep` opens an undo step; later calls in a run replace it. */
	applyContent: (children: BlockConfig[], options: { newStep: boolean }) => BlockConfig[];
	/** Saves the page now, as the Save button does; `blocks` is the tree to save when it is newer than what has been drawn yet. */
	saveNow: (blocks?: BlockConfig[]) => void;
};

const DocsModeContext = createContext<DocsModeValue | null>(null);

export const DocsModeContextProvider = DocsModeContext.Provider;

/** Null outside the docs editor. */
export const useDocsMode = (): DocsModeValue | null => useContext(DocsModeContext);

/** For screens that only exist in the docs editor: a missing provider is a wiring mistake, so it throws. */
export function useRequiredDocsMode(): DocsModeValue {
	const value = useContext(DocsModeContext);
	if (!value) throw new Error("This screen belongs to the docs editor and needs DocsModeProvider above it.");
	return value;
}

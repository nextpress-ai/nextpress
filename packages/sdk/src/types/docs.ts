/**
 * Docs types. These copy the server's contract (`shared/docs/types.ts` in the app) so the published
 * SDK needs no file from the app. Keep the shapes the same as that file: a change there is a change
 * here. The `*Params` types at the end are the SDK's own named inputs; they only add defaults.
 */

/** A link in the docs header. */
export type DocsShellLink = { label: string; url: string };

/** The search button of the docs header. */
export type DocsShellSearch = { show: boolean; label: string; placeholder: string };

/** The docs-wide switches. A page can switch one of these off for itself, never on when the docs have it off. */
export type DocsFeatures = { sidebar: boolean; toc: boolean; prevNext: boolean; copyPage: boolean };

/** The button in the docs header (for example "Get started"). An empty label means no button. */
export type DocsShellButton = { label: string; url: string };

/** The docs-wide settings: header, search and switches. Kept on the docs home page. */
export type DocsSettings = {
	title: string;
	logoUrl: string;
	logoDarkUrl: string;
	links: DocsShellLink[];
	button: DocsShellButton;
	search: DocsShellSearch;
	features: DocsFeatures;
};

/** One docs on a site, for lists and pickers. */
export type DocsSummary = {
	/** The docs' id, which is the id of its home page. The other docs calls take it as `homeId`. */
	homeId: string;
	siteId: string;
	/** The docs' name: the settings title, else the home page's title. */
	name: string;
	/** The home page's address, e.g. `/docs`. */
	path: string;
	pageCount: number;
	searchOn: boolean;
	status: string;
};

/** A page is a docs page with text; a group only holds other pages in the sidebar. */
export type DocsItemKind = "page" | "group";

/** One row of the navigation tree. */
export type DocsTreeItem = {
	id: string;
	title: string;
	slug: string;
	/** The nested address, e.g. `/docs/getting-started/install`. */
	path: string;
	/** Null only for the home page. */
	parentId: string | null;
	menuOrder: number;
	status: string;
	kind: DocsItemKind;
	hidden: boolean;
	/** On the home only, when the docs has an address of its own: its pages' addresses start at the site root. */
	ownAddress?: boolean;
	children: DocsTreeItem[];
};

/** A docs' navigation tree and its settings. */
export type DocsTree = { home: DocsTreeItem; settings: DocsSettings };

/** The server's input for creating a docs. */
export type CreateDocsInput = {
	siteId: string;
	name: string;
	/** The home page's address part, e.g. `docs`. */
	slug: string;
	logoUrl?: string;
	search?: boolean;
	features?: Partial<DocsFeatures>;
	/**
	 * The docs is the homepage of a site with an address of its own (`docs.example.com`): its pages
	 * are addressed from the site root (`/install`, not `/docs/install`). Older addresses still open.
	 */
	ownAddress?: boolean;
};

/** What creating a docs returns: its summary, and the `homeId` the other docs calls take. */
export type CreateDocsResult = { docs: DocsSummary; homeId: string };

/** Only what changes. `search` and `features` may name just the switches that change. */
export type UpdateDocsSettingsInput = Partial<Omit<DocsSettings, "search" | "features">> & {
	search?: Partial<DocsShellSearch>;
	features?: Partial<DocsFeatures>;
};

/** The server's input for adding a page or a group. */
export type AddDocsItemInput = {
	parentId: string;
	title: string;
	kind: DocsItemKind;
	/** Defaults to one made from the title, and made unique on the site. */
	slug?: string;
	/** Index among the parent's pages. Default: last. */
	position?: number;
};

export type UpdateDocsItemInput = {
	title?: string;
	slug?: string;
	/** Move under another page of the same docs. Never the item itself or a page under it. */
	parentId?: string;
	hidden?: boolean;
	kind?: DocsItemKind;
};

/** The full new order of one parent's pages. */
export type ReorderDocsInput = { parentId: string; orderedIds: string[] };

/** What the delete and reorder calls return. */
export type DocsOkResult = { ok: true };

/** Input for `docs.list`. The site defaults to the client's site. */
export type ListDocsParams = { siteId?: string };

/**
 * Input for `docs.create`. The site defaults to the client's site, and an empty `slug` makes the
 * address from the name.
 */
export type CreateDocsParams = Omit<CreateDocsInput, "siteId" | "slug"> & {
	siteId?: string;
	slug?: string;
};

/** Input for `docs.updateSettings`: the docs home, and the settings that change. */
export type UpdateDocsSettingsParams = { homeId: string } & UpdateDocsSettingsInput;

/** Input for `docs.addItem`: the docs it goes in, and the page or group. */
export type AddDocsItemParams = { homeId: string } & AddDocsItemInput;

/** Input for `docs.updateItem`: the page or group, and what changes on it. */
export type UpdateDocsItemParams = { pageId: string } & UpdateDocsItemInput;

/** Input for `docs.reorder`: the docs, then the parent whose pages are ordered. */
export type ReorderDocsParams = { homeId: string } & ReorderDocsInput;

/** Input for `docs.exportFile`. Pass `includeFiles: false` for a small file with no images. */
export type ExportDocsParams = { homeId: string; includeFiles?: boolean };

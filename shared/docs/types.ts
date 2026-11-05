import type { DocsFeatures, DocsShellButton, DocsShellLink, DocsShellSearch } from "../blocks/docs-shell-model.js";

/**
 * The docs system: what the editor, the server routes, the SDK and MCP agree on.
 *
 * A docs is a top-level page whose page shell holds a `docs/shell` block with `inherit` off (the
 * docs home). Every page under it is a docs page: page shell → `docs/shell` (inherit on) →
 * `docs/page` → the page's docs blocks, each block its own block. Docs-wide settings live on the
 * home page's shell; a page's own flags live in `page.other.docs` (`PageDocsFlags`). No table of
 * its own, so a docs travels in an ordinary page file and needs no database change.
 *
 * Routes (all under `/api/docs`, signed in; API keys need `pages:read` / `pages:write`):
 * - `GET    /api/docs?siteId=`                → `{ docs: DocsSummary[] }`
 * - `POST   /api/docs`                        → `CreateDocsInput` → `CreateDocsResult`
 * - `GET    /api/docs/:homeId/tree`           → `DocsTree`
 * - `GET    /api/docs/items/:pageId`          → `DocsTree` of the docs that page sits in
 * - `PUT    /api/docs/:homeId/settings`       → `UpdateDocsSettingsInput` → `{ settings: DocsSettings }`
 * - `POST   /api/docs/:homeId/items`          → `AddDocsItemInput` → `{ item: DocsTreeItem }`
 * - `PATCH  /api/docs/items/:pageId`          → `UpdateDocsItemInput` → `{ item: DocsTreeItem }`
 * - `PUT    /api/docs/:homeId/order`          → `ReorderDocsInput` → `{ ok: true }`
 * - `DELETE /api/docs/items/:pageId`          → `{ ok: true }` (deleted the way any page is; refused while it has pages under it)
 * - `GET    /api/docs/:homeId/export?files=1` → a page file (`PagePackage`) with every page of the docs
 */

/** The docs-wide settings, as kept on the home page's shell. */
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
	homeId: string;
	siteId: string;
	/** The docs' name: the shell title, else the home page's title. */
	name: string;
	/** The home page's address, e.g. `/docs`. */
	path: string;
	pageCount: number;
	searchOn: boolean;
	status: string;
};

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

export type DocsTree = { home: DocsTreeItem; settings: DocsSettings };

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

export type CreateDocsResult = { docs: DocsSummary; homeId: string };

/** Only what changes; `search` and `features` may name just the switches that change. */
export type UpdateDocsSettingsInput = Partial<Omit<DocsSettings, "search" | "features">> & {
	search?: Partial<DocsShellSearch>;
	features?: Partial<DocsFeatures>;
};

export type AddDocsItemInput = {
	parentId: string;
	title: string;
	kind: DocsItemKind;
	/** Defaults to one made from the title (and made unique on the site). */
	slug?: string;
	/** Index among the parent's pages; default last. */
	position?: number;
};

export type UpdateDocsItemInput = {
	title?: string;
	slug?: string;
	/** Move under another page of the same docs (never the item itself or a page under it). */
	parentId?: string;
	hidden?: boolean;
	kind?: DocsItemKind;
};

/** The full new order of one parent's pages. */
export type ReorderDocsInput = { parentId: string; orderedIds: string[] };

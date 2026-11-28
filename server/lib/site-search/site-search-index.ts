import { createHash } from "node:crypto";
import MiniSearch from "minisearch";
import { buildPagePaths, pagePathInputOf } from "@shared/page-paths";
import type { BlockConfig } from "@shared/schema-types";
import type { Deps } from "../../routes/shared/deps";
import { isPubliclyReadable } from "../is-publicly-readable";
import { SITE_PAGE_LIMIT } from "../page-paths/page-paths";
import { readSitePagesFingerprint } from "../page-paths/site-page-tree";
import type { SearchablePage } from "./build-search-documents";
import { buildSearchIndexPayload } from "./build-search-index-payload";
import { SEARCH_INDEX_OPTIONS, SEARCH_INDEX_VERSION, type SearchDocument, type SearchIndexPayload } from "./search-index-options";

type PageModels = Pick<Deps["models"], "pages">;

/** Quiet time after the last page change before the index is rebuilt, so a burst of saves becomes one rebuild. */
const QUIET_MS = 1500;
/** Up to this much extra, picked at random, so sites that changed together do not all rebuild on the same tick. */
const EXTRA_WAIT_MS = 400;

/** The index as it is sent, with the tag that tells a browser whether its copy is still current. */
export type BuiltSearchIndex = {
	/** How the site's pages looked just before they were read (see `readSitePagesFingerprint`). */
	fingerprint: string;
	etag: string;
	builtAt: string;
	body: string;
};

export type SiteSearchIndex = {
	/** Rebuild this site's index soon. Returns at once; many calls close together make one rebuild. */
	schedule: (params: { siteId: string }) => void;
	/** How the site's pages look right now and the tag that goes with it. Two small queries, no build. */
	readStamp: (params: { siteId: string }) => Promise<{ fingerprint: string; etag: string }>;
	/** The index for pages that look like `fingerprint`: the saved one if it is current, else one made now (one build at a time, shared). */
	read: (params: { siteId: string; fingerprint: string }) => Promise<BuiltSearchIndex>;
	/** Search this site's index for `query` and return the stored result fields, best match first. */
	search: (params: { siteId: string; query: string; limit?: number }) => Promise<SearchHit[]>;
};

/** One search result: where to open it and the words to show. The same fields the browser's copy keeps. */
export type SearchHit = {
	path: string;
	pageTitle: string;
	heading: string;
	excerpt: string;
	/** Higher is a better match. */
	score: number;
};

type SiteState = {
	built: BuiltSearchIndex | null;
	waiting: ReturnType<typeof setTimeout> | null;
	building: Promise<BuiltSearchIndex> | null;
	changedWhileBuilding: boolean;
	/** The built body loaded back into a searchable index, kept beside it so a query does not load it twice. */
	searchable: { built: BuiltSearchIndex; mini: MiniSearch<SearchDocument> } | null;
};

/** Weak tag: the same pages give the same words, whatever way the reply is compressed. */
const etagOf = (fingerprint: string): string =>
	`W/"${createHash("sha256").update(`${SEARCH_INDEX_VERSION}:${fingerprint}`).digest("base64url").slice(0, 22)}"`;

/**
 * Every page visitors may read, with its full address. One read of the site's pages gives both the
 * list and the addresses (a draft parent still shows in its child's address), instead of two reads
 * of whole rows.
 */
const loadReadablePages = async ({ models, siteId }: { models: PageModels; siteId: string }): Promise<SearchablePage[]> => {
	const rows = await models.pages.findManyWhere([{ where: "siteId", equals: siteId }], { limit: SITE_PAGE_LIMIT });
	const paths = buildPagePaths(rows.map(pagePathInputOf));
	return rows
		.filter((row) => isPubliclyReadable(row))
		.map((row) => ({
			id: row.id,
			title: row.title,
			path: paths.get(row.id) ?? row.slug,
			blocks: (Array.isArray(row.blocks) ? row.blocks : []) as BlockConfig[],
		}));
};

const makeIndex = async ({ models, siteId, now }: { models: PageModels; siteId: string; now: () => Date }) => {
	// Read first: a page saved while the pages are being read leaves this copy marked older than the
	// database, so the next request builds again instead of missing that save.
	const fingerprint = await readSitePagesFingerprint({ models, siteId });
	const pages = await loadReadablePages({ models, siteId });
	const { payload, skipped } = await buildSearchIndexPayload({ pages, builtAt: now() });
	const built: BuiltSearchIndex = { fingerprint, etag: etagOf(fingerprint), builtAt: payload.builtAt, body: JSON.stringify(payload) };
	return { built, skipped };
};

/**
 * The prebuilt search index of every site: made after pages change, kept in memory, handed out as
 * ready-made JSON. Rules: one build at a time per site; a change during a build leads to exactly one
 * more; and a request never trusts the saved copy blindly (a restart or a page change that nobody
 * announced shows up as a different fingerprint, and the next request builds first).
 */
export const createSiteSearchIndex = ({
	models,
	quietMs = QUIET_MS,
	extraWaitMs = EXTRA_WAIT_MS,
	random = Math.random,
	now = () => new Date(),
}: {
	models: PageModels;
	quietMs?: number;
	extraWaitMs?: number;
	random?: () => number;
	now?: () => Date;
}): SiteSearchIndex => {
	const sites = new Map<string, SiteState>();

	const stateOf = (siteId: string): SiteState => {
		const existing = sites.get(siteId);
		if (existing) return existing;
		const created: SiteState = { built: null, waiting: null, building: null, changedWhileBuilding: false, searchable: null };
		sites.set(siteId, created);
		return created;
	};

	const stopWaiting = (state: SiteState): void => {
		if (state.waiting) clearTimeout(state.waiting);
		state.waiting = null;
	};

	const startBuild = (siteId: string): Promise<BuiltSearchIndex> => {
		const state = stateOf(siteId);
		if (state.building) return state.building;
		// This build reads the newest pages, so a rebuild still waiting for its quiet time is not needed.
		stopWaiting(state);
		state.changedWhileBuilding = false;

		const building = makeIndex({ models, siteId, now }).then(({ built, skipped }) => {
			skipped.forEach(({ pageId, error }) =>
				console.error({ atFunction: "siteSearchIndex.build", data: { siteId, pageId, error }, message: "A page was left out of the search index because its text could not be read" }),
			);
			state.built = built;
			return built;
		});
		state.building = building;
		const finish = (): void => {
			state.building = null;
			if (!state.changedWhileBuilding) return;
			state.changedWhileBuilding = false;
			schedule({ siteId });
		};
		building.then(finish, finish);
		return building;
	};

	const schedule = ({ siteId }: { siteId: string }): void => {
		const state = stateOf(siteId);
		if (state.building) {
			state.changedWhileBuilding = true;
			return;
		}
		stopWaiting(state);
		state.waiting = setTimeout(() => {
			state.waiting = null;
			startBuild(siteId).catch((error: Error) =>
				console.error({ atFunction: "siteSearchIndex.rebuild", data: { siteId, error }, message: "Could not rebuild the search index after a page change" }),
			);
		}, quietMs + Math.round(random() * extraWaitMs));
	};

	const readStamp = async ({ siteId }: { siteId: string }): Promise<{ fingerprint: string; etag: string }> => {
		const fingerprint = await readSitePagesFingerprint({ models, siteId });
		return { fingerprint, etag: etagOf(fingerprint) };
	};

	const read = async ({ siteId, fingerprint }: { siteId: string; fingerprint: string }): Promise<BuiltSearchIndex> => {
		const { built } = stateOf(siteId);
		if (built?.fingerprint === fingerprint) return built;
		return startBuild(siteId);
	};

	/** Default result count: enough for a page of results, small enough to answer at once. */
	const DEFAULT_HITS = 20;

	/**
	 * Searches the site's saved index on the server. The built body is loaded back into MiniSearch
	 * with the same options it was made with, then kept beside the body, so a run of queries loads it
	 * once. A newer build replaces it. Only the fields the browser copy also keeps come back; the full
	 * page text stays on the server.
	 */
	const search = async ({ siteId, query, limit = DEFAULT_HITS }: { siteId: string; query: string; limit?: number }): Promise<SearchHit[]> => {
		const trimmed = query.trim();
		if (!trimmed) return [];
		const state = stateOf(siteId);
		const stamp = await readStamp({ siteId });
		const built = await read({ siteId, fingerprint: stamp.fingerprint });
		if (!state.searchable || state.searchable.built !== built) {
			const payload = JSON.parse(built.body) as SearchIndexPayload;
			state.searchable = { built, mini: MiniSearch.loadJSON<SearchDocument>(JSON.stringify(payload.index), SEARCH_INDEX_OPTIONS) };
		}
		const max = Math.min(Math.max(1, limit), 50);
		return state.searchable.mini
			.search(trimmed, { combineWith: "AND" })
			.slice(0, max)
			.map((result) => ({
				path: String(result.path ?? ""),
				pageTitle: String(result.pageTitle ?? ""),
				heading: String(result.heading ?? ""),
				excerpt: String(result.excerpt ?? ""),
				score: result.score,
			}));
	};

	return { schedule, readStamp, read, search };
};

const indexes = new WeakMap<PageModels["pages"], SiteSearchIndex>();

/**
 * The search index of this app's pages. There is one per model layer, so the page routes that
 * announce a change and the public route that serves the index talk to the same one, and every
 * test gets its own.
 */
export const siteSearchIndexOf = ({ models }: { models: PageModels }): SiteSearchIndex => {
	const existing = indexes.get(models.pages);
	if (existing) return existing;
	const created = createSiteSearchIndex({ models });
	indexes.set(models.pages, created);
	return created;
};

/**
 * Tell search that a site's pages changed (made, saved, published, unpublished, moved, reordered,
 * restored, copied, deleted or imported). The index is rebuilt a moment later, off the request, so
 * a save is never slowed down by it. A change nobody announces is still caught: the next request
 * for the index sees the pages changed and builds first.
 */
export const scheduleSearchIndexRebuild = ({ models, siteId }: { models: PageModels; siteId: string }): void =>
	siteSearchIndexOf({ models }).schedule({ siteId });

import { parsePageOther } from "@shared/page-other";
import type { AddDocsItemInput, DocsTreeItem, ReorderDocsInput, UpdateDocsItemInput } from "@shared/docs";
import type { Deps } from "../../routes/shared/deps";
import { normalizePageSlug } from "../../utils";
import { deletePageWithDependencies } from "../delete-page";
import { savePageVersion } from "../save-page-version";
import { scheduleSearchIndexRebuild } from "../site-search";
import { createDocsPage, emptyDocsText } from "./create-docs-page";
import { refuseDocs } from "./docs-refusal";
import { descendantsOf, docsHomeOf, loadDocsSitePages, type DocsPageRow, type DocsSitePages } from "./docs-site-pages";
import { toDocsTreeItem } from "./docs-tree";

type ItemsDeps = { models: Deps["models"]; hooks: Deps["hooks"]; newId: () => string };

const MAX_TITLE = 200;

const cleanTitle = (title: string): string => {
	const trimmed = title.trim();
	if (!trimmed) throw refuseDocs({ statusCode: 400, message: "Give the page a title." });
	if (trimmed.length > MAX_TITLE) throw refuseDocs({ statusCode: 400, message: `Keep the title under ${MAX_TITLE} characters.` });
	return trimmed;
};

/** The page and its docs home; refuses a page that sits in no docs, or in another docs. */
const requireInDocs = ({ site, pageId, homeId }: { site: DocsSitePages; pageId: string; homeId?: string }): { row: DocsPageRow; home: DocsPageRow } => {
	const row = site.byId.get(pageId);
	const home = row ? docsHomeOf({ site, pageId }) : null;
	if (!row || !home || (homeId && home.id !== homeId)) {
		throw refuseDocs({ statusCode: 404, message: "That page isn't part of these docs any more. Refresh and try again." });
	}
	return { row, home };
};

/** Gives the parent's pages the order 0, 1, 2… as listed; never touches a page outside the list. */
const writeOrder = async ({ models, ids }: { models: Deps["models"]; ids: string[] }): Promise<void> => {
	for (const [index, id] of ids.entries()) await models.pages.update(id, { menuOrder: index });
};

/**
 * Adding, changing, ordering and removing the pages of a docs. Each change is checked against the
 * docs it belongs to, so a page never moves into another docs or under itself.
 */
export function createDocsItems({ models, hooks, newId }: ItemsDeps) {
	const addItem = async ({ siteId, homeId, authorId, input }: { siteId: string; homeId: string; authorId: string; input: AddDocsItemInput }): Promise<DocsTreeItem> => {
		const site = await loadDocsSitePages({ models, siteId });
		requireInDocs({ site, pageId: input.parentId, homeId });
		const title = cleanTitle(input.title);
		const siblings = site.childrenOf.get(input.parentId) ?? [];
		const position = Math.max(0, Math.min(input.position ?? siblings.length, siblings.length));
		const created = await createDocsPage({
			models,
			hooks,
			newId,
			siteId,
			authorId,
			title,
			slug: input.slug,
			parentId: input.parentId,
			menuOrder: position,
			home: false,
			children: input.kind === "group" ? [] : emptyDocsText({ newId }),
			flags: input.kind === "group" ? { group: true } : undefined,
		});
		const ordered = [...siblings.map((row) => row.id)];
		ordered.splice(position, 0, created.id);
		await writeOrder({ models, ids: ordered });
		const after = await loadDocsSitePages({ models, siteId });
		const row = after.byId.get(created.id) ?? created;
		return toDocsTreeItem({ site: after, row });
	};

	const updateItem = async ({ siteId, pageId, input }: { siteId: string; pageId: string; input: UpdateDocsItemInput }): Promise<DocsTreeItem> => {
		const site = await loadDocsSitePages({ models, siteId });
		const { row, home } = requireInDocs({ site, pageId });
		const isHome = row.id === home.id;
		const changes: Record<string, unknown> = {};

		if (input.title !== undefined) changes.title = cleanTitle(input.title);
		if (input.slug !== undefined && input.slug !== row.slug) {
			const slug = normalizePageSlug(input.slug);
			if (!slug) throw refuseDocs({ statusCode: 400, message: "The address can only use letters, numbers and dashes." });
			const taken = await models.pages.findBySiteAndSlug(siteId, slug);
			if (taken && taken.id !== row.id) throw refuseDocs({ statusCode: 409, message: `Another page already uses "${slug}". Pick a different address.` });
			changes.slug = slug;
		}
		if (input.parentId !== undefined && input.parentId !== row.parentId) {
			if (isHome) throw refuseDocs({ statusCode: 400, message: "The docs home stays at the top." });
			const target = requireInDocs({ site, pageId: input.parentId, homeId: home.id });
			const under = new Set(descendantsOf({ site, pageId: row.id }).map((item) => item.id));
			if (target.row.id === row.id || under.has(target.row.id)) {
				throw refuseDocs({ statusCode: 400, message: "A page can't move under itself or a page inside it." });
			}
			changes.parentId = target.row.id;
			changes.menuOrder = (site.childrenOf.get(target.row.id) ?? []).length;
		}
		if (input.hidden !== undefined || input.kind !== undefined) {
			if (isHome && (input.kind === "group" || input.hidden === true)) {
				throw refuseDocs({ statusCode: 400, message: "The docs home is always a page in the sidebar." });
			}
			const other = parsePageOther(row.other);
			const docs = { ...other.docs };
			if (input.hidden !== undefined) docs.hidden = input.hidden || undefined;
			if (input.kind !== undefined) docs.group = input.kind === "group" || undefined;
			changes.other = { ...other, docs };
		}
		if (Object.keys(changes).length > 0) {
			await savePageVersion({ models, hooks, page: row, changes, expectedVersion: row.version ?? 0 });
		}
		const after = await loadDocsSitePages({ models, siteId });
		return toDocsTreeItem({ site: after, row: after.byId.get(row.id) ?? row, isHome });
	};

	const reorder = async ({ siteId, homeId, input }: { siteId: string; homeId: string; input: ReorderDocsInput }): Promise<void> => {
		const site = await loadDocsSitePages({ models, siteId });
		requireInDocs({ site, pageId: input.parentId, homeId });
		const current = (site.childrenOf.get(input.parentId) ?? []).map((row) => row.id);
		const same = current.length === input.orderedIds.length && new Set(input.orderedIds).size === current.length && input.orderedIds.every((id) => current.includes(id));
		if (!same) throw refuseDocs({ statusCode: 409, message: "The pages changed while you were moving them. Refresh and try again." });
		await writeOrder({ models, ids: input.orderedIds });
		scheduleSearchIndexRebuild({ models, siteId });
	};

	const deleteItem = async ({ siteId, pageId }: { siteId: string; pageId: string }): Promise<void> => {
		const site = await loadDocsSitePages({ models, siteId });
		const { row } = requireInDocs({ site, pageId });
		if ((site.childrenOf.get(row.id) ?? []).length > 0) {
			throw refuseDocs({ statusCode: 409, message: "Move or delete the pages under this one first." });
		}
		await deletePageWithDependencies({ models, hooks }, { id: row.id, slug: row.slug ?? null, siteId });
		scheduleSearchIndexRebuild({ models, siteId });
	};

	return { addItem, updateItem, reorder, deleteItem };
}

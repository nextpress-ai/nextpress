import { createDefaultBlock } from "@shared/block-catalog/create-default-block";
import { buildDocsPageBlocks, DOCS_PAGE_DESIGN } from "@shared/docs/docs-page-frame";
import type { DocsSettings } from "@shared/docs";
import { mergePageOtherWithThemeDefaults } from "@shared/theme-to-page-design";
import { validateContentForSave } from "@shared/validate-content-save";
import type { BlockConfig, PageDocsFlags } from "@shared/schema-types";
import type { Deps } from "../../routes/shared/deps";
import { resolveSiteThemeSettings } from "../../routes/shared/resolve-site-theme-settings";
import { uniquePageSlug } from "../../routes/shared/duplicate-page";
import { scheduleSearchIndexRebuild } from "../site-search";
import { emptyParagraphContent } from "@shared/docs/empty-paragraph";
import { fitToDocsColumn } from "@shared/docs/docs-column-spacing";
import { refuseDocs } from "./docs-refusal";
import type { DocsPageRow } from "./docs-site-pages";

/** A text block with nothing in it yet: where a new docs page's writing starts. */
export function emptyDocsText({ newId }: { newId: () => string }): BlockConfig[] {
	const block = createDefaultBlock({ name: "core/paragraph", id: newId(), newId });
	if (!block) return [];
	return [{ ...fitToDocsColumn(block), content: emptyParagraphContent() }];
}

/**
 * Creates one docs page (or the docs home) the way a page is created anywhere else: the site's
 * theme for its look, a free address, the save checks, the save hook and a search rebuild. Its
 * design spans the window so the docs frame alone decides widths.
 */
export async function createDocsPage({
	models,
	hooks,
	newId,
	siteId,
	authorId,
	title,
	slug,
	parentId,
	menuOrder,
	home,
	settings,
	children,
	flags,
}: {
	models: Deps["models"];
	hooks: Deps["hooks"];
	newId: () => string;
	siteId: string;
	authorId: string;
	title: string;
	slug?: string;
	parentId: string | null;
	menuOrder: number;
	home: boolean;
	settings?: Partial<DocsSettings>;
	children: BlockConfig[];
	flags?: PageDocsFlags;
}): Promise<DocsPageRow> {
	const theme = await resolveSiteThemeSettings({ models, siteId });
	const themed = mergePageOtherWithThemeDefaults({ themeSettings: theme.themeId ? theme.settings : null, other: {} });
	const other = { ...themed, design: { ...themed.design, ...DOCS_PAGE_DESIGN }, ...(flags && Object.keys(flags).length > 0 ? { docs: flags } : {}) };
	const validation = validateContentForSave({ blocks: buildDocsPageBlocks({ newId, home, settings, children }), other, contentType: "page" });
	if (!validation.ok) {
		throw refuseDocs({ statusCode: 400, message: validation.error.message, cause: `Docs page refused by the save checks: ${validation.error.message}` });
	}
	const freeSlug = await uniquePageSlug({
		title: slug?.trim() || title,
		isTaken: async (candidate) => Boolean(await models.pages.findBySiteAndSlug(siteId, candidate)),
	});
	const created = await models.pages.create({
		title,
		slug: freeSlug,
		siteId,
		authorId,
		status: "draft",
		parentId,
		menuOrder,
		blocks: validation.blocks,
		other: validation.other,
	});
	hooks.doAction("save_post", created);
	scheduleSearchIndexRebuild({ models, siteId });
	return created;
}

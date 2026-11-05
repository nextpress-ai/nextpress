import { DEFAULT_DOCS_FEATURES, DEFAULT_DOCS_SHELL_CONTENT } from "@shared/blocks/docs-shell-model";
import { readDocsSettings, replaceDocsHomeSettings } from "@shared/docs/docs-page-frame";
import type { CreateDocsInput, CreateDocsResult, DocsSettings, DocsSummary, DocsTree, UpdateDocsSettingsInput } from "@shared/docs";
import type { PagePackage } from "@shared/page-transfer";
import { validateContentForSave } from "@shared/validate-content-save";
import type { Deps } from "../../routes/shared/deps";
import type { createPagePackageBuilder } from "../page-transfer/build-page-package";
import { savePageVersion } from "../save-page-version";
import { createDocsPage, emptyDocsText } from "./create-docs-page";
import { createDocsItems } from "./docs-items";
import { refuseDocs } from "./docs-refusal";
import { descendantsOf, docsHomeOf, isDocsHomeRow, loadDocsSitePages, pageBlocks, type DocsPageRow } from "./docs-site-pages";
import { buildDocsTree, summarizeDocs } from "./docs-tree";

type DocsServiceDeps = {
	models: Deps["models"];
	hooks: Deps["hooks"];
	newId: () => string;
	builder: ReturnType<typeof createPagePackageBuilder>;
};

/** Runs the settings through the shell reader, so only known fields with sane values are saved. */
const cleanSettings = ({ current, input }: { current: DocsSettings; input: UpdateDocsSettingsInput }): DocsSettings =>
	readDocsSettings([
		{
			id: "settings-check",
			name: "docs/shell",
			type: "container",
			parentId: null,
			content: {
				kind: "structured",
				data: {
					...current,
					...input,
					search: { ...current.search, ...input.search },
					features: { ...current.features, ...input.features },
					inherit: false,
				},
			},
		},
	]);

/**
 * The docs system on the server: a docs is a top-level page whose shell keeps its own settings,
 * with its pages under it. No table of its own, so it works without a migration and moves
 * between sites in an ordinary page file.
 */
export function createDocsService({ models, hooks, newId, builder }: DocsServiceDeps) {
	const items = createDocsItems({ models, hooks, newId });

	const requireHome = async ({ homeId }: { homeId: string }): Promise<{ home: DocsPageRow; siteId: string }> => {
		const home = await models.pages.findById(homeId);
		if (!home || !isDocsHomeRow(home)) throw refuseDocs({ statusCode: 404, message: "These docs no longer exist." });
		return { home, siteId: String(home.siteId) };
	};

	const listDocs = async ({ siteId }: { siteId: string }): Promise<DocsSummary[]> => {
		const site = await loadDocsSitePages({ models, siteId });
		return site.rows.filter(isDocsHomeRow).map((home) => summarizeDocs({ site, home }));
	};

	const createDocs = async ({ input, authorId }: { input: CreateDocsInput; authorId: string }): Promise<CreateDocsResult> => {
		const name = input.name.trim();
		if (!name) throw refuseDocs({ statusCode: 400, message: "Give your docs a name." });
		const home = await createDocsPage({
			models,
			hooks,
			newId,
			siteId: input.siteId,
			authorId,
			title: name,
			slug: input.slug,
			...(input.ownAddress ? { flags: { ownAddress: true } } : {}),
			parentId: null,
			menuOrder: 0,
			home: true,
			settings: {
				title: name,
				logoUrl: input.logoUrl?.trim() ?? "",
				search: { ...DEFAULT_DOCS_SHELL_CONTENT.search, show: input.search ?? true },
				features: { ...DEFAULT_DOCS_FEATURES, ...input.features },
			},
			children: emptyDocsText({ newId }),
		});
		const site = await loadDocsSitePages({ models, siteId: input.siteId });
		return { docs: summarizeDocs({ site, home: site.byId.get(home.id) ?? home }), homeId: home.id };
	};

	const readTree = async ({ homeId }: { homeId: string }): Promise<DocsTree> => {
		const { home, siteId } = await requireHome({ homeId });
		const site = await loadDocsSitePages({ models, siteId });
		return buildDocsTree({ site, home: site.byId.get(home.id) ?? home });
	};

	/** The tree of the docs a page sits in, for an editor or agent that only knows the page. */
	const readTreeOfPage = async ({ siteId, pageId }: { siteId: string; pageId: string }): Promise<DocsTree> => {
		const site = await loadDocsSitePages({ models, siteId });
		const home = docsHomeOf({ site, pageId });
		if (!home) throw refuseDocs({ statusCode: 404, message: "That page isn't part of any docs." });
		return buildDocsTree({ site, home });
	};

	const updateSettings = async ({ homeId, input }: { homeId: string; input: UpdateDocsSettingsInput }): Promise<DocsSettings> => {
		const { home } = await requireHome({ homeId });
		const settings = cleanSettings({ current: readDocsSettings(pageBlocks(home)), input });
		const validation = validateContentForSave({
			blocks: replaceDocsHomeSettings({ blocks: pageBlocks(home), settings }),
			other: home.other,
			contentType: "page",
		});
		if (!validation.ok) throw refuseDocs({ statusCode: 400, message: validation.error.message });
		await savePageVersion({ models, hooks, page: home, changes: { blocks: validation.blocks }, expectedVersion: home.version ?? 0 });
		return settings;
	};

	/** The whole docs as one page file: the home first, every page under it as extra pages, tree kept. */
	const exportDocs = async ({ homeId, includeFiles }: { homeId: string; includeFiles: boolean }): Promise<PagePackage> => {
		const { home, siteId } = await requireHome({ homeId });
		const site = await loadDocsSitePages({ models, siteId });
		return builder.buildForPage({ page: home, extraPages: descendantsOf({ site, pageId: home.id }), includeFiles });
	};

	/** A page by id, for routes that must check its site before anything else. */
	const findPage = (pageId: string) => models.pages.findById(pageId);

	return {
		listDocs,
		createDocs,
		readTree,
		readTreeOfPage,
		updateSettings,
		exportDocs,
		findPage,
		...items,
	};
}

export type DocsService = ReturnType<typeof createDocsService>;

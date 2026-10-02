import type { BlockConfig, Theme } from "@shared/schema-types";
import type { pages } from "@shared/schema";

type PageRow = typeof pages.$inferSelect;
import { rewriteFileRefs, rewritePageLinks, type PagePackage, type StoredPackageFiles } from "@shared/page-transfer";
import { validateContentForSave } from "@shared/validate-content-save";
import { ensureRootPageShell } from "@shared/page-shell-model";
import { reIdBlocks } from "@shared/re-id-blocks";
import { parseThemeSettings } from "@shared/theme-settings";
import { otherForDuplicatedPage, uniquePageSlug } from "../../routes/shared/duplicate-page";
import type { PackageFileStore } from "./store-package-files";

export type ImportedTheme =
	| { status: "none" }
	| { status: "skipped"; name: string }
	| { status: "added" | "reused"; name: string; id: string };

export type PageImportResult = {
	/** The main page (first in `pages`). */
	page: PageRow;
	pages: PageRow[];
	/** Pages whose address was taken here, so they got a new one; links to them follow. */
	renamed: { title: string; from: string; to: string }[];
	files: StoredPackageFiles;
	theme: ImportedTheme;
};

/** Refusal with a message for the owner; routes turn it into a 400. */
type PageImportRefusal = Error & { publicMessage: string };

const refuseImport = (publicMessage: string): PageImportRefusal =>
	Object.assign(new Error(publicMessage), { publicMessage });

export const isPageImportRefusal = (error: Error): error is PageImportRefusal =>
	typeof (error as Partial<PageImportRefusal>).publicMessage === "string";

type PageImportDeps = {
	store: PackageFileStore;
	generateId: () => string;
	isSlugTaken: (params: { siteId: string; slug: string }) => Promise<boolean>;
	createPage: (data: {
		title: string;
		slug: string;
		siteId: string;
		authorId: string;
		status: string;
		featuredImage: string | null;
		blocks: BlockConfig[];
		other: unknown;
	}) => Promise<PageRow>;
	findThemesByName: (name: string) => Promise<Theme[]>;
	createTheme: (data: {
		name: string;
		description: string | null;
		authorId: string;
		settings: unknown;
	}) => Promise<Theme>;
	/** Makes this theme the one the site draws with. */
	activateTheme: (params: { siteId: string; themeId: string }) => Promise<void>;
	draftStatus: string;
};

/**
 * Turns a page file into a new draft page on this site.
 * The page gets new ids and a free web address, its files land in this site's media library,
 * and every file path in its blocks is pointed at the new copies. Nothing is published.
 * When the owner asks for the theme, it is added and switched on for this site.
 */
export function createPageImporter(deps: PageImportDeps) {
	const addTheme = async ({
		theme,
		authorId,
	}: {
		theme: NonNullable<PagePackage["theme"]>;
		authorId: string;
	}): Promise<ImportedTheme> => {
		const settings = parseThemeSettings(theme.settings);
		const sameName = await deps.findThemesByName(theme.name);
		const identical = sameName.find(
			(existing) => JSON.stringify(parseThemeSettings(existing.settings)) === JSON.stringify(settings),
		);
		if (identical) return { status: "reused", name: identical.name, id: identical.id };

		const name = sameName.length > 0 ? `${theme.name} (imported)` : theme.name;
		const created = await deps.createTheme({
			name,
			description: theme.description,
			authorId,
			settings,
		});
		return { status: "added", name: created.name, id: created.id };
	};

	/** One page from the file: the main page first, then any linked pages that came along. */
	type IncomingPage = { title: string; slug: string; featuredImage: string | null; other: Record<string, unknown>; blocks: BlockConfig[] };

	const checkContent = (page: IncomingPage) => {
		const validation = validateContentForSave({
			blocks: reIdBlocks({ blocks: page.blocks, generateId: deps.generateId }),
			other: otherForDuplicatedPage(page.other),
			contentType: "page",
		});
		if (!validation.ok) {
			throw refuseImport(`"${page.title}" has content this site can't use: ${validation.error.message}`);
		}
		return validation;
	};

	/** Free addresses for every page, so two imported pages never compete for the same one. */
	const reserveSlugs = async ({ siteId, incoming }: { siteId: string; incoming: IncomingPage[] }): Promise<string[]> => {
		const reserved = new Set<string>();
		const slugs: string[] = [];
		for (const page of incoming) {
			const slug = await uniquePageSlug({
				title: page.slug || page.title,
				isTaken: async (candidate) => reserved.has(candidate) || (await deps.isSlugTaken({ siteId, slug: candidate })),
			});
			reserved.add(slug);
			slugs.push(slug);
		}
		return slugs;
	};

	const importPage = async ({
		pkg,
		siteId,
		authorId,
		includeTheme,
	}: {
		pkg: PagePackage;
		siteId: string;
		authorId: string;
		includeTheme: boolean;
	}): Promise<PageImportResult> => {
		if (!pkg.page) {
			throw refuseImport("These are copied blocks, not a page file. Paste them in the editor instead.");
		}
		const incoming: IncomingPage[] = [{ ...pkg.page, blocks: pkg.blocks }, ...(pkg.extraPages ?? [])];

		// Every page must be usable before anything is written, so a bad page never leaves half an import.
		incoming.forEach(checkContent);

		const files = await deps.store.storeFiles({ files: pkg.files, siteId, authorId });
		const slugs = await reserveSlugs({ siteId, incoming });
		const slugMap = Object.fromEntries(
			incoming
				.map((page, index) => [page.slug.toLowerCase(), slugs[index]!] as const)
				.filter(([from, to]) => from && from !== to),
		);

		const created: PageRow[] = [];
		for (const [index, page] of incoming.entries()) {
			const moved = rewritePageLinks({
				value: rewriteFileRefs({
					value: { blocks: page.blocks, other: page.other, featuredImage: page.featuredImage },
					refMap: files.refMap,
				}),
				slugMap,
			});
			const validation = checkContent({ ...page, ...moved });
			created.push(
				await deps.createPage({
					title: page.title.trim() || "Imported page",
					slug: slugs[index]!,
					siteId,
					authorId,
					status: deps.draftStatus,
					featuredImage: moved.featuredImage,
					blocks: ensureRootPageShell({
						blocks: Array.isArray(validation.blocks) ? (validation.blocks as BlockConfig[]) : [],
						shellId: deps.generateId(),
					}).blocks,
					other: validation.other,
				}),
			);
		}

		const theme: ImportedTheme = !pkg.theme
			? { status: "none" }
			: includeTheme
				? await addTheme({ theme: pkg.theme, authorId })
				: { status: "skipped", name: pkg.theme.name };
		if (theme.status === "added" || theme.status === "reused") {
			await deps.activateTheme({ siteId, themeId: theme.id });
		}

		const renamed = incoming
			.map((page, index) => ({ title: page.title, from: page.slug, to: slugs[index]! }))
			.filter((item) => item.from && item.from.toLowerCase() !== item.to);
		return { page: created[0]!, pages: created, renamed, files, theme };
	};

	return { importPage };
}

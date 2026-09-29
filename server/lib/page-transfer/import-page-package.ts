import type { BlockConfig, Theme } from "@shared/schema-types";
import type { pages } from "@shared/schema";

type PageRow = typeof pages.$inferSelect;
import { rewriteFileRefs, type PagePackage, type StoredPackageFiles } from "@shared/page-transfer";
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
	page: PageRow;
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
	draftStatus: string;
};

/**
 * Turns a page file into a new draft page on this site.
 * The page gets new ids and a free web address, its files land in this site's media library,
 * and every file path in its blocks is pointed at the new copies. Nothing is published and the
 * site's active theme never changes.
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

		const files = await deps.store.storeFiles({ files: pkg.files, siteId, authorId });
		const moved = rewriteFileRefs({
			value: { blocks: pkg.blocks, other: pkg.page.other, featuredImage: pkg.page.featuredImage },
			refMap: files.refMap,
		});

		const other = otherForDuplicatedPage(moved.other);
		const validation = validateContentForSave({
			blocks: reIdBlocks({ blocks: moved.blocks, generateId: deps.generateId }),
			other,
			contentType: "page",
		});
		if (!validation.ok) {
			throw refuseImport(`This page has content this site can't use: ${validation.error.message}`);
		}

		const title = pkg.page.title.trim() || "Imported page";
		const slug = await uniquePageSlug({
			title: pkg.page.slug || title,
			isTaken: (candidate) => deps.isSlugTaken({ siteId, slug: candidate }),
		});

		const page = await deps.createPage({
			title,
			slug,
			siteId,
			authorId,
			status: deps.draftStatus,
			featuredImage: moved.featuredImage,
			blocks: ensureRootPageShell({
				blocks: Array.isArray(validation.blocks) ? (validation.blocks as BlockConfig[]) : [],
				shellId: deps.generateId(),
			}).blocks,
			other: validation.other,
		});

		const theme: ImportedTheme = !pkg.theme
			? { status: "none" }
			: includeTheme
				? await addTheme({ theme: pkg.theme, authorId })
				: { status: "skipped", name: pkg.theme.name };

		return { page, files, theme };
	};

	return { importPage };
}

import type { pages } from "@shared/schema";
import { findPageLinks, HOMEPAGE_PATH } from "@shared/page-transfer";

type PageRow = typeof pages.$inferSelect;

/** Most pages one export offers; enough for a small site, and a guard against link loops. */
const MAX_LINKED_PAGES = 50;

export type LinkedPage = {
	id: string;
	title: string;
	slug: string;
	status: string | null;
	/** 1 = the exported page links to it; 2 = a linked page links to it; and so on. */
	depth: number;
	isHomepage: boolean;
	/** Title of the page whose link led here. */
	linkedFrom: string;
};

export type LinkedPagesResult = {
	pages: LinkedPage[];
	/** Addresses linked to that have no page on this site (e.g. `/terms-and-conditions`). */
	missing: string[];
};

/**
 * Pages the given page links to, then the pages those link to, and so on (up to 50).
 * The homepage is listed but never followed further: its links usually reach the whole site.
 * Trashed pages count as missing.
 */
export function createLinkedPagesFinder({
	findBySiteAndSlug,
	readHomepageSlug,
}: {
	findBySiteAndSlug: (siteId: string, slug: string) => Promise<PageRow | undefined>;
	readHomepageSlug: (siteId: string) => Promise<string | null>;
}) {
	const findLinked = async ({ page }: { page: PageRow }): Promise<LinkedPagesResult> => {
		const siteId = String(page.siteId);
		const homepageSlug = await readHomepageSlug(siteId);
		const found: LinkedPage[] = [];
		const missing = new Set<string>();
		const seen = new Set<string>([page.slug.toLowerCase()]);
		let frontier: { row: PageRow; depth: number }[] = [{ row: page, depth: 0 }];

		while (frontier.length > 0 && found.length < MAX_LINKED_PAGES) {
			const next: { row: PageRow; depth: number }[] = [];
			for (const { row, depth } of frontier) {
				const links = findPageLinks({ blocks: row.blocks, other: row.other });
				for (const link of links) {
					const slug = link === HOMEPAGE_PATH ? homepageSlug : link;
					if (!slug || seen.has(slug.toLowerCase()) || found.length >= MAX_LINKED_PAGES) continue;
					seen.add(slug.toLowerCase());
					const target = await findBySiteAndSlug(siteId, slug);
					if (!target || target.status === "trash") {
						missing.add(`/${slug}`);
						continue;
					}
					const isHomepage = homepageSlug !== null && target.slug === homepageSlug;
					found.push({
						id: target.id,
						title: target.title,
						slug: target.slug,
						status: target.status,
						depth: depth + 1,
						isHomepage,
						linkedFrom: row.title,
					});
					if (!isHomepage) next.push({ row: target, depth: depth + 1 });
				}
			}
			frontier = next;
		}
		return { pages: found, missing: [...missing] };
	};

	return { findLinked };
}

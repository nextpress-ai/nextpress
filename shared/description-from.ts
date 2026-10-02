/**
 * Where the search and link-preview description comes from.
 * A page can follow the site, or choose for itself.
 */

export const DESCRIPTION_FROM = ["auto", "page", "excerpt", "site"] as const;
export type DescriptionFrom = (typeof DESCRIPTION_FROM)[number];

export const PAGE_DESCRIPTION_FROM = ["inherit", ...DESCRIPTION_FROM] as const;
export type PageDescriptionFrom = (typeof PAGE_DESCRIPTION_FROM)[number];

export const SITE_DESCRIPTION_FROM_OPTIONS: readonly { value: DescriptionFrom; label: string }[] = [
	{ value: "auto", label: "Page, then excerpt, then the site" },
	{ value: "page", label: "The page description" },
	{ value: "excerpt", label: "The excerpt" },
	{ value: "site", label: "The site description" },
];

export const PAGE_DESCRIPTION_FROM_OPTIONS: readonly { value: PageDescriptionFrom; label: string }[] = [
	{ value: "inherit", label: "Same as the site" },
	{ value: "auto", label: "Meta description, then excerpt, then the site" },
	{ value: "page", label: "The meta description" },
	{ value: "excerpt", label: "The excerpt" },
	{ value: "site", label: "The site description" },
];

export function readDescriptionFrom(value: string | null | undefined): DescriptionFrom {
	if (value === "page" || value === "excerpt" || value === "site" || value === "auto") return value;
	return "auto";
}

export function readPageDescriptionFrom(value: string | null | undefined): PageDescriptionFrom {
	if (value === "inherit" || value === "page" || value === "excerpt" || value === "site" || value === "auto") {
		return value;
	}
	return "inherit";
}

/** The text search results and link previews use. */
export function resolvePublishedDescription({
	metaDescription,
	excerpt,
	siteDescription,
	pageFrom,
	siteFrom,
}: {
	metaDescription?: string;
	excerpt?: string;
	siteDescription?: string;
	pageFrom?: string | null;
	siteFrom?: string | null;
}): string {
	const pageChoice = readPageDescriptionFrom(pageFrom);
	const choice = pageChoice === "inherit" ? readDescriptionFrom(siteFrom) : pageChoice;
	const pageText = metaDescription?.trim() || "";
	const excerptText = excerpt?.trim() || "";
	const siteText = siteDescription?.trim() || "";
	if (choice === "page") return pageText;
	if (choice === "excerpt") return excerptText;
	if (choice === "site") return siteText;
	return pageText || excerptText || siteText;
}

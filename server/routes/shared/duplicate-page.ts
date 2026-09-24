import { normalizePageSlug } from "../../utils";
import { parsePageOther } from "@shared/page-other";
import type { PageDesignSettings } from "@shared/schema-types";

const MAX_SLUG_TRIES = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A free URL from the new title. If `copy-of-home` is taken, tries `copy-of-home-2`, then 3, …
 */
export async function uniquePageSlug({
	title,
	isTaken,
}: {
	title: string;
	isTaken: (slug: string) => Promise<boolean>;
}): Promise<string> {
	const base = normalizePageSlug(title) || "page";
	let candidate = base;
	for (let n = 2; n <= MAX_SLUG_TRIES; n += 1) {
		if (!(await isTaken(candidate))) return candidate;
		candidate = `${base}-${n}`;
	}
	throw new Error("Could not find a free URL for this page");
}

/**
 * Page extras for a copy: keep the look, drop blog-landing flags so a second blog page is not born.
 */
export function otherForDuplicatedPage(other: unknown): Record<string, unknown> {
	if (!isRecord(other)) return {};
	const { isBlogPage: _blogPage, blogId: _blogId, ...rest } = other;
	return rest;
}

/** Page look from extras, used when an old copy has no page shell yet. */
export function leftoverDesignForDuplicate(other: unknown): PageDesignSettings | undefined {
	return parsePageOther(otherForDuplicatedPage(other)).design;
}

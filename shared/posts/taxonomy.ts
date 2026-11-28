import { parsePostOther } from "../posts/post-other";

/** A category or tag with how many posts in the site carry it. */
export type TaxonomyTerm = { name: string; count: number };

const foldName = (name: string): string => name.trim().toLowerCase();

/**
 * Counts the categories (or tags) across a site's posts. Names live in `posts.other` as JSON, so
 * there is no table to read: the list is derived from the posts themselves. Names that differ only
 * by capitals and surrounding spaces are one term ("News" and " news " both count as "news"), and the
 * spelling shown is the one used most often, so the list reads the way most posts write it. The
 * result is sorted most used first, then by name, so two calls on the same posts agree.
 */
export function countTaxonomyTerms({
	posts,
	field,
}: {
	posts: { other?: unknown; categories?: string[] | null; tags?: string[] | null }[];
	field: "categories" | "tags";
}): TaxonomyTerm[] {
	const counts = new Map<string, number>();
	const spellings = new Map<string, Map<string, number>>();

	for (const post of posts) {
		const flat = field === "categories" ? post.categories : post.tags;
		const names =
			Array.isArray(flat) && flat.length > 0
				? flat
				: parsePostOther(post.other)[field] ?? [];
		// One post counts once per term, even when it names it twice.
		const seen = new Set<string>();
		for (const raw of names) {
			if (typeof raw !== "string") continue;
			const trimmed = raw.trim();
			if (!trimmed) continue;
			const key = foldName(trimmed);
			if (seen.has(key)) continue;
			seen.add(key);
			counts.set(key, (counts.get(key) ?? 0) + 1);
			const bySpelling = spellings.get(key) ?? new Map<string, number>();
			bySpelling.set(trimmed, (bySpelling.get(trimmed) ?? 0) + 1);
			spellings.set(key, bySpelling);
		}
	}

	return [...counts.entries()]
		.map(([key, count]) => ({ name: pickSpelling(spellings.get(key)), count }))
		.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

/** The spelling used most often for one term; ties go to the one seen first, then alphabetical. */
function pickSpelling(bySpelling: Map<string, number> | undefined): string {
	if (!bySpelling || bySpelling.size === 0) return "";
	let best = "";
	let bestCount = -1;
	for (const [spelling, count] of bySpelling) {
		if (count > bestCount) {
			best = spelling;
			bestCount = count;
		}
	}
	return best;
}

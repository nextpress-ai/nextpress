import { parsePostOther } from "../../posts/post-other";

export type ImportedWpEntry = {
	nextpressId: string;
};

/**
 * Maps WordPress wpId → NextPress content id for items previously imported
 * from the same normalized WP base URL (matches import re-update detection).
 */
export const buildImportedWpMap = (params: {
	items: Array<{ id: string; other: unknown }>;
	domain: string;
}): Map<number, ImportedWpEntry> => {
	const map = new Map<number, ImportedWpEntry>();
	params.items.forEach((item) => {
		const parsed = parsePostOther(item.other);
		if (
			parsed.import?.source === "wordpress" &&
			parsed.import.domain === params.domain
		) {
			map.set(parsed.import.wpId, { nextpressId: item.id });
		}
	});
	return map;
};

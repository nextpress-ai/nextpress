import type { BlockConfig, PageOther } from "@shared/schema-types";
import {
	collectFontFamiliesFromBlocks,
	isBundledFontFamily,
} from "@shared/font-catalog";

export { collectFontFamiliesFromBlocks } from "@shared/font-catalog";

/** @deprecated Use bundled Fontsource fonts; returns no CDN URLs. */
export const collectGoogleFontUrls = (_args: {
	blocks: BlockConfig[];
	pageDesign?: PageOther["design"];
}): string[] => [];

/** Families in use that are bundled via Fontsource (subset hint for future lazy load). */
export const collectUsedBundledFontFamilies = ({
	blocks,
	pageDesign,
}: {
	blocks: BlockConfig[];
	pageDesign?: PageOther["design"];
}): string[] => {
	const families = new Set<string>();
	if (pageDesign?.fontFamily && isBundledFontFamily(pageDesign.fontFamily)) {
		families.add(pageDesign.fontFamily);
	}
	for (const ff of collectFontFamiliesFromBlocks(blocks)) {
		if (isBundledFontFamily(ff)) {
			families.add(ff);
		}
	}
	return [...families];
};

import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types.js";
import {
	MIN_FORM_FONT_SIZE,
	MIN_TOUCH_TARGET_PX,
	PROSE_MAX_WIDTH,
	SPACING_BY_TIER,
	type ViewportTier,
} from "./responsive-scales.js";

export type ResponsiveWarning = {
	code: string;
	message: string;
	blockId: string;
};

type DefaultResult = {
	styles: CSSProperties;
	classNames: string[];
	warnings: ResponsiveWarning[];
};

const parsePxWidth = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return null;
	const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
	return match ? Number.parseFloat(match[1]) : null;
};

const readStructuredData = (block: BlockConfig): Record<string, unknown> => {
	const content = block.content;
	if (!content || typeof content !== "object") return {};
	if ("kind" in content && content.kind === "structured" && content.data && typeof content.data === "object") {
		return content.data as Record<string, unknown>;
	}
	return content as Record<string, unknown>;
};

const hasUserFontSize = (styles: CSSProperties | undefined): boolean =>
	Boolean(styles?.fontSize);

/** Applies responsive runtime defaults — does not mutate the block. */
export function applyResponsiveDefaults({
	block,
	tier = "large",
}: {
	block: BlockConfig;
	tier?: ViewportTier;
}): DefaultResult {
	const styles: CSSProperties = { ...(block.styles ?? {}) };
	const classNames: string[] = [];
	const warnings: ResponsiveWarning[] = [];
	const tierPadding = SPACING_BY_TIER.containerPadding[tier];

	switch (block.name) {
		case "core/container": {
			if (!styles.width) styles.width = "100%";
			if (!styles.maxWidth) styles.maxWidth = "100%";
			if (!styles.boxSizing) styles.boxSizing = "border-box";
			if (tier === "mobile" && !block.other?.deviceStyles?.mobile?.padding) {
				styles.padding = tierPadding;
			}
			break;
		}
		case "core/group": {
			if (!styles.width) styles.width = "100%";
			if (!styles.boxSizing) styles.boxSizing = "border-box";
			if (tier === "mobile" && !block.other?.deviceStyles?.mobile?.padding) {
				styles.padding = SPACING_BY_TIER.groupPadding.mobile;
			}
			break;
		}
		case "core/columns": {
			if (!styles.width) styles.width = "100%";
			break;
		}
		case "core/image":
		case "post/featured-image": {
			const px = parsePxWidth(styles.width);
			if (px && px > 400) {
				warnings.push({
					code: "FIXED_WIDE_IMAGE",
					message: "Image width may overflow on mobile; max-width 100% applied.",
					blockId: block.id,
				});
			}
			styles.maxWidth = styles.maxWidth ?? "100%";
			if (!styles.height || styles.height === "auto") {
				styles.height = "auto";
			}
			break;
		}
		case "core/paragraph":
		case "post/excerpt": {
			if (!styles.maxWidth) styles.maxWidth = PROSE_MAX_WIDTH;
			break;
		}
		case "core/heading":
		case "post/title": {
			if (!hasUserFontSize(styles)) {
				classNames.push("np-responsive-heading");
			}
			break;
		}
		case "core/button": {
			const minH = parsePxWidth(styles.minHeight) ?? parsePxWidth(styles.height);
			if (!minH || minH < MIN_TOUCH_TARGET_PX) {
				styles.minHeight = `${MIN_TOUCH_TARGET_PX}px`;
			}
			if (!styles.fontSize) styles.fontSize = MIN_FORM_FONT_SIZE;
			break;
		}
		case "core/buttons": {
			if (!styles.flexWrap) styles.flexWrap = "wrap";
			break;
		}
		case "core/media-text": {
			const data = readStructuredData(block);
			const stacked = data.isStackedOnMobile !== false;
			if (stacked) classNames.push("is-stacked-on-mobile");
			break;
		}
		case "core/gallery": {
			classNames.push("np-responsive-gallery");
			break;
		}
		case "core/video":
		case "core/audio": {
			if (!styles.width) styles.width = "100%";
			if (!styles.maxWidth) styles.maxWidth = "100%";
			break;
		}
		case "core/cover": {
			if (!styles.minHeight) styles.minHeight = "clamp(240px, 50vh, 400px)";
			break;
		}
		case "core/code":
		case "core/preformatted": {
			if (!styles.maxWidth) styles.maxWidth = "100%";
			if (!styles.overflowX) styles.overflowX = "auto";
			break;
		}
		case "core/table": {
			classNames.push("np-responsive-table");
			break;
		}
		case "core/input":
		case "core/textarea":
		case "core/select": {
			if (!styles.width) styles.width = "100%";
			if (!styles.fontSize) styles.fontSize = MIN_FORM_FONT_SIZE;
			break;
		}
		default:
			break;
	}

	return { styles, classNames, warnings };
}

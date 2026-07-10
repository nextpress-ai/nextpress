import type { BlockConfig } from "../types/domain.js";
import { sanitizeBlockOverrides } from "./sanitize-block-overrides.js";

export type BlockOverrideShell = {
	html?: string;
	js?: string;
	css?: string;
	customCss?: string;
};

/**
 * Applies sanitized html/js/css overrides onto a built block config.
 * - `css` → `customCss` + `other.css` (style layer)
 * - `html` → `other.html`
 * - `js` → `other.js`
 */
export const applySanitizedBlockOverrides = (
	block: BlockConfig,
	overrides: BlockOverrideShell,
): BlockConfig => {
	const sanitized = sanitizeBlockOverrides({
		html: overrides.html,
		js: overrides.js,
		css: overrides.css ?? overrides.customCss,
	});

	if (!sanitized.html && !sanitized.js && !sanitized.css) {
		return block;
	}

	const other = { ...(block.other ?? {}) };

	if (sanitized.html) {
		other.html = sanitized.html;
	}

	if (sanitized.js) {
		other.js = sanitized.js;
	}

	if (sanitized.css) {
		return {
			...block,
			customCss: sanitized.css,
			other: { ...other, css: sanitized.css },
		};
	}

	return { ...block, other };
};

/**
 * Sanitizes html block content values when `sanitized` is true (default).
 */
export const sanitizeHtmlBlockContent = (value: string, sanitized = true): string =>
	sanitized ? sanitizeBlockOverrides({ html: value }).html ?? "" : value;

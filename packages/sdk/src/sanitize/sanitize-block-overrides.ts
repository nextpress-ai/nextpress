import { sanitizeCustomCss } from "./sanitize-custom-css.js";
import { sanitizeHtml } from "./sanitize-html.js";
import { sanitizeJs } from "./sanitize-js.js";

export type BlockOverrideInput = {
	html?: string;
	js?: string;
	css?: string;
};

export type SanitizedBlockOverrides = {
	html?: string;
	js?: string;
	css?: string;
};

/**
 * Sanitizes top-level block escape hatches before persisting to NextPress.
 * Always run on `html`, `js`, and `css` params from the block builder.
 */
export function sanitizeBlockOverrides(input: BlockOverrideInput): SanitizedBlockOverrides {
	return {
		...(input.html !== undefined ? { html: sanitizeHtml(input.html) } : {}),
		...(input.js !== undefined ? { js: sanitizeJs(input.js) } : {}),
		...(input.css !== undefined ? { css: sanitizeCustomCss(input.css) } : {}),
	};
}

export { sanitizeHtml, sanitizeJs, sanitizeCustomCss };

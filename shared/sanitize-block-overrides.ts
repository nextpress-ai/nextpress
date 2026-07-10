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

/** Sanitizes SDK/editor block override fields before persistence or render. */
export function sanitizeBlockOverrides(input: BlockOverrideInput): SanitizedBlockOverrides {
	return {
		...(input.html !== undefined ? { html: sanitizeHtml(input.html) } : {}),
		...(input.js !== undefined ? { js: sanitizeJs(input.js) } : {}),
		...(input.css !== undefined ? { css: sanitizeCustomCss(input.css) } : {}),
	};
}

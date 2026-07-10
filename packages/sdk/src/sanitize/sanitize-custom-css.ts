/** @see shared/sanitize-custom-css.ts — keep in sync for published SDK */
export function sanitizeCustomCss(css: string): string {
	if (!css) return "";
	return css
		.replace(/<\/style/gi, "")
		.replace(/<script/gi, "")
		.replace(/javascript:/gi, "");
}

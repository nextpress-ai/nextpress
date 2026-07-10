/**
 * Prevents breaking out of injected `<style>` tags when rendering block custom CSS.
 */
export function sanitizeCustomCss(css: string): string {
	if (!css) return "";
	return css
		.replace(/<\/style/gi, "")
		.replace(/<script/gi, "")
		.replace(/javascript:/gi, "");
}

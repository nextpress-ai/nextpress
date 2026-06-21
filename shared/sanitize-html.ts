/**
 * Lightweight, dependency-free HTML sanitizer shared by the isomorphic renderers
 * and the WordPress importer. Mirrors the regex approach already used in the
 * client utils and the SSR HTML block so behaviour stays consistent.
 *
 * This is intentionally conservative (strip script/style + event handlers +
 * dangerous URL schemes). It is NOT a full HTML sanitizer; trusted-ish content
 * (page-builder authored or imported-then-stored) is the expected input.
 */
export function sanitizeHtml(html: string): string {
	if (!html) return "";
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
		.replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
		.replace(/\son\w+\s*=\s*'[^']*'/gi, "")
		.replace(/javascript:/gi, "")
		.replace(/vbscript:/gi, "");
}

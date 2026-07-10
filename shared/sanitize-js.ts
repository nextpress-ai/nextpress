/**
 * Conservative inline-JS sanitizer for block `other.js` overrides.
 * Strips common XSS vectors; not a sandbox — treat output as untrusted-ish user content.
 */
export function sanitizeJs(js: string): string {
	if (!js) return "";

	let out = js
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<\/script>/gi, "")
		.replace(/javascript:/gi, "")
		.replace(/vbscript:/gi, "");

	const blocked = [
		/\beval\s*\(/gi,
		/\bnew\s+Function\s*\(/gi,
		/\bFunction\s*\(/gi,
		/document\.write\s*\(/gi,
		/document\.writeln\s*\(/gi,
		/\.innerHTML\s*=/gi,
		/\.outerHTML\s*=/gi,
		/\bimport\s*\(/gi,
		/\bimport\s+/gi,
		/__proto__/gi,
		/constructor\s*\[/gi,
		/setTimeout\s*\(\s*["'`]/gi,
		/setInterval\s*\(\s*["'`]/gi,
	];

	for (const pattern of blocked) {
		out = out.replace(pattern, "/* blocked */");
	}

	return out.trim();
}

import type { PackageFileLeftOut } from "./types.js";

const escapeXml = (text: string): string =>
	text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

const MAX_NAME_CHARS = 48;

/** Plain-words reason shown in import and paste summaries. */
export const LEFT_OUT_REASONS: Record<PackageFileLeftOut, string> = {
	"left-out": "left out on export",
	"not-in-clipboard": "too big to copy",
	"too-large": "larger than the upload limit",
	"not-found": "missing on the original site",
};

/**
 * A neutral 16:9 picture that names the file it stands in for, so the layout keeps its shape
 * and the owner can see which file to put back.
 */
export function buildPlaceholderSvg({ name }: { name: string }): string {
	const shown = name.length > MAX_NAME_CHARS ? `${name.slice(0, MAX_NAME_CHARS - 1)}…` : name;
	return [
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">',
		'<rect width="1600" height="900" fill="#e5e7eb"/>',
		'<rect x="24" y="24" width="1552" height="852" fill="none" stroke="#9ca3af" stroke-width="4" stroke-dasharray="24 16"/>',
		'<text x="800" y="420" text-anchor="middle" font-family="system-ui, sans-serif" font-size="56" fill="#374151">Missing file</text>',
		`<text x="800" y="500" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" fill="#4b5563">${escapeXml(shown)}</text>`,
		"</svg>",
	].join("");
}

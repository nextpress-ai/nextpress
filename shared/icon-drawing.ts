/**
 * How an icon is drawn on a published page without shipping whole icon libraries.
 *
 * - Lucide ships with the site already, so a name is enough.
 * - react-icons families are 0.4–5.5 MB each. When one is picked, the editor saves the icon's
 *   small SVG drawing (`svg`) on the reference, and published pages paint that.
 * - Brand logos (svgl) and your own uploads are files in the media library (`url`).
 *
 * Anything SVG that we store or paint goes through `sanitizeSvgMarkup` first.
 */

/** Sets whose icons are a picture file in the media library. */
export const ICON_FILE_SETS: ReadonlySet<string> = new Set(["svgl", "custom"]);

/** Longest inline icon drawing we accept. Real icons are a few hundred bytes to a few KB. */
export const ICON_SVG_MAX_CHARS = 20_000;

/** Longest SVG file we clean and keep (logos and uploaded icons). */
export const SVG_FILE_MAX_BYTES = 512 * 1024;

/** File types an uploaded icon may be. */
export const ICON_FILE_EXTENSIONS = [".svg", ".png", ".webp"] as const;

/** The svgl.app files the server is allowed to fetch — nothing else on the internet. */
export const SVGL_FILE_ORIGIN = "https://svgl.app";
export const SVGL_FILE_PATH_PREFIX = "/library/";

export type SvgSanitizeResult = { ok: true; svg: string } | { ok: false; message: string };

/**
 * True for a picture in this site's media library (`/uploads/<file>`), with an icon file type.
 * WHY: icon references must never point off-site or climb out of the uploads folder.
 */
export function isLocalIconFileUrl(
	url: string,
	extensions: readonly string[] = ICON_FILE_EXTENSIONS,
): boolean {
	if (!/^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(url)) return false;
	if (url.includes("..")) return false;
	const lower = url.toLowerCase();
	return extensions.some((ext) => lower.endsWith(ext));
}

/** True for a logo file on svgl.app that the server may download. */
export function isSvglFileUrl(url: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	return (
		parsed.origin === SVGL_FILE_ORIGIN &&
		parsed.pathname.startsWith(SVGL_FILE_PATH_PREFIX) &&
		/^\/library\/[A-Za-z0-9._-]+\.svg$/.test(parsed.pathname) &&
		parsed.search === "" &&
		parsed.hash === ""
	);
}

const DANGEROUS_BLOCK_TAGS = ["script", "foreignObject", "iframe", "embed", "object", "audio", "video"];

const removeBlockTag = (svg: string, tag: string): string =>
	svg
		.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "")
		.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");

/** Keeps in-file links (`#id`) and embedded pictures; drops every other link target. */
const cleanLinkAttributes = (svg: string): string =>
	svg.replace(
		/\s(xlink:href|href)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi,
		(match, _name: string, _quoted: string, dq?: string, sq?: string) => {
			const value = (dq ?? sq ?? "").trim();
			const safe = value.startsWith("#") || /^data:image\/(png|jpe?g|gif|webp);/i.test(value);
			return safe ? match : "";
		},
	);

/**
 * Cleans SVG markup so it cannot run code — neither inline on a page nor when the file is opened
 * on its own. Removes scripts, embedded HTML, event handlers, `javascript:` and outside links;
 * refuses DOCTYPE/ENTITY tricks and anything that is not one `<svg>` root.
 */
export function sanitizeSvgMarkup(raw: string): SvgSanitizeResult {
	if (/<!DOCTYPE|<!ENTITY/i.test(raw)) {
		return { ok: false, message: "SVG with a DOCTYPE or ENTITY is not allowed" };
	}

	let svg = raw
		.replace(/^﻿/, "")
		.replace(/<\?xml[\s\S]*?\?>/gi, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.trim();

	if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>$/i.test(svg)) {
		return { ok: false, message: "Not an SVG drawing" };
	}

	for (const tag of DANGEROUS_BLOCK_TAGS) {
		svg = removeBlockTag(svg, tag);
	}

	svg = svg
		.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/@import[^;]*;?/gi, "")
		.replace(/javascript:/gi, "")
		.replace(/vbscript:/gi, "");

	svg = cleanLinkAttributes(svg);
	return { ok: true, svg };
}

/** True when the markup is already clean (cleaning would change nothing). */
export function isCleanSvgMarkup(raw: string): boolean {
	const result = sanitizeSvgMarkup(raw);
	return result.ok && result.svg === raw.trim();
}

/** A readable, stable name from a logo title: "GitHub Copilot" → "github-copilot". */
export function slugifyIconName(title: string): string {
	return title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

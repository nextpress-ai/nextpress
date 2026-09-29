import type { PackageFileLeftOut } from "./types.js";

/** Copied text above this makes browsers slow or refuse the clipboard. */
export const CLIPBOARD_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const CLIPBOARD_TOTAL_MAX_BYTES = 8 * 1024 * 1024;

/** Largest page file the server reads (files travel as base64, a third bigger than on disk). */
export const PAGE_PACKAGE_MAX_BYTES = 200 * 1024 * 1024;

/**
 * Decides whether one file travels with the package or becomes a placeholder.
 * Clipboard: images only, each small, and a running total so a long page does not
 * blow the clipboard up. Page file: everything up to the upload limit unless the owner
 * left files out.
 */
export function decideFileTravel({
	mode,
	mimeType,
	size,
	uploadLimit,
	clipboardBytesSoFar = 0,
}: {
	mode: "export" | "export-without-files" | "clipboard";
	mimeType: string;
	size: number;
	uploadLimit: number;
	clipboardBytesSoFar?: number;
}): { travels: true } | { travels: false; leftOut: PackageFileLeftOut } {
	if (mode === "export-without-files") return { travels: false, leftOut: "left-out" };
	if (size > uploadLimit) return { travels: false, leftOut: "too-large" };
	if (mode === "export") return { travels: true };

	const fitsClipboard =
		mimeType.startsWith("image/") &&
		size <= CLIPBOARD_FILE_MAX_BYTES &&
		clipboardBytesSoFar + size <= CLIPBOARD_TOTAL_MAX_BYTES;
	return fitsClipboard ? { travels: true } : { travels: false, leftOut: "not-in-clipboard" };
}

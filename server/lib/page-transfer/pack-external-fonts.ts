import { createHash } from "node:crypto";
import path from "node:path";
import {
	findExternalFontUrls,
	findFontFileUrls,
	isAllowedFontUrl,
	rewriteExternalFonts,
	type ExternalFontUrl,
} from "@shared/page-transfer/external-fonts";
import type { PackageFile } from "@shared/page-transfer";

const MAX_FONT_FILES = 24;

const MIME_BY_EXT: Record<string, string> = {
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".otf": "font/otf",
};

export type RemoteFontBody = {
	bytes: Buffer;
	contentType: string;
};

/**
 * Downloads Google font files named by the page and rewrites those addresses to
 * `/uploads/…` paths that travel in the page file. A font that cannot be fetched
 * stays as the original address, so the page still loads it from the host.
 */
export async function packExternalFonts<T>({
	value,
	readRemote,
	uploadLimit,
}: {
	value: T;
	readRemote: (url: string) => Promise<RemoteFontBody | null>;
	uploadLimit: number;
}): Promise<{ value: T; files: PackageFile[] }> {
	const wanted = findExternalFontUrls(value).filter((item) => isAllowedFontUrl(item.url));
	if (wanted.length === 0) return { value, files: [] };

	const files: PackageFile[] = [];
	const fileRefs = new Map<string, string>();
	const stylesheets = new Map<string, string>();

	const takeFile = async (url: string): Promise<void> => {
		if (fileRefs.has(url) || files.length >= MAX_FONT_FILES) return;
		const ext = path.extname(new URL(url).pathname).toLowerCase();
		const mimeType = MIME_BY_EXT[ext];
		if (!mimeType) return;
		const body = await readRemote(url);
		if (!body || body.bytes.length === 0 || body.bytes.length > uploadLimit) return;
		const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
		const ref = `/uploads/np-font-${hash}${ext}`;
		fileRefs.set(url, ref);
		files.push({
			ref,
			name: path.basename(new URL(url).pathname),
			mimeType,
			size: body.bytes.length,
			data: body.bytes.toString("base64"),
		});
	};

	const takeStylesheet = async (item: ExternalFontUrl): Promise<void> => {
		const body = await readRemote(item.url);
		if (!body) return;
		let css = body.bytes.toString("utf8");
		for (const fontUrl of findFontFileUrls(css)) {
			if (!isAllowedFontUrl(fontUrl)) continue;
			await takeFile(fontUrl);
			const ref = fileRefs.get(fontUrl);
			if (ref) css = css.split(fontUrl).join(ref);
		}
		stylesheets.set(item.url, css);
	};

	for (const item of wanted) {
		if (item.kind === "stylesheet") await takeStylesheet(item);
		else await takeFile(item.url);
	}

	if (stylesheets.size === 0 && fileRefs.size === 0) return { value, files: [] };
	return {
		value: rewriteExternalFonts({ value, stylesheets, files: fileRefs }),
		files,
	};
}

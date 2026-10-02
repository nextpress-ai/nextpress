import path from "node:path";
import { promises as fs } from "node:fs";
import type { BlockConfig, Media } from "@shared/schema-types";
import type { pages } from "@shared/schema";

type PageRow = typeof pages.$inferSelect;
import {
	decideFileTravel,
	findUploadRefs,
	PAGE_PACKAGE_FORMAT,
	PAGE_PACKAGE_VERSION,
	type PackageExtraPage,
	type PackageFile,
	type PackageTheme,
	type PagePackage,
} from "@shared/page-transfer";
import { packExternalFonts, type RemoteFontBody } from "./pack-external-fonts";

/** Guess for a referenced file that is on disk but has no media row (older uploads). */
const MIME_BY_EXTENSION: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mp3": "audio/mp3",
	".wav": "audio/wav",
	".pdf": "application/pdf",
	".txt": "text/plain",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Builds the downloadable page file: the page, every file its blocks use, and the site theme.
 * Files are read from this site's uploads folder only; a path that would leave it is treated
 * as missing.
 */
const readRemoteFont = async (url: string): Promise<RemoteFontBody | null> => {
	try {
		const response = await fetch(url, {
			redirect: "manual",
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) return null;
		const bytes = Buffer.from(await response.arrayBuffer());
		return { bytes, contentType: response.headers.get("content-type") ?? "" };
	} catch (error) {
		console.error("[page-transfer] Font file was not fetched", { atFunction: "readRemoteFont", url, error });
		return null;
	}
};

export function createPagePackageBuilder({
	listSiteMedia,
	readActiveTheme,
	uploadDir,
	uploadLimit,
	appVersion,
	readRemote = readRemoteFont,
}: {
	listSiteMedia: (siteId: string) => Promise<Media[]>;
	readActiveTheme: (siteId: string) => Promise<PackageTheme | null>;
	uploadDir: string;
	uploadLimit: number;
	appVersion: string;
	readRemote?: (url: string) => Promise<RemoteFontBody | null>;
}) {
	const readUpload = async (ref: string): Promise<Buffer | null> => {
		const filePath = path.resolve(uploadDir, path.basename(ref));
		if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) return null;
		return fs.readFile(filePath).catch(() => null);
	};

	const packFile = async ({
		ref,
		row,
		includeFiles,
	}: {
		ref: string;
		row: Media | undefined;
		includeFiles: boolean;
	}): Promise<PackageFile> => {
		const name = row?.originalName ?? path.basename(ref);
		const mimeType = row?.mimeType ?? MIME_BY_EXTENSION[path.extname(ref).toLowerCase()] ?? "application/octet-stream";
		const described = {
			ref,
			name,
			mimeType,
			...(row?.alt ? { alt: row.alt } : {}),
			...(row?.caption ? { caption: row.caption } : {}),
		};

		const bytes = await readUpload(ref);
		if (!bytes) return { ...described, size: row?.size ?? 0, leftOut: "not-found" };

		const travel = decideFileTravel({
			mode: includeFiles ? "export" : "export-without-files",
			mimeType,
			size: bytes.length,
			uploadLimit,
		});
		if (!travel.travels) return { ...described, size: bytes.length, leftOut: travel.leftOut };
		return { ...described, size: bytes.length, data: bytes.toString("base64") };
	};

	const toPackagePage = (row: PageRow): PackageExtraPage => ({
		title: row.title,
		slug: row.slug,
		featuredImage: row.featuredImage ?? null,
		other: isRecord(row.other) ? row.other : {},
		blocks: Array.isArray(row.blocks) ? (row.blocks as BlockConfig[]) : [],
	});

	/**
	 * The page as one package, with any linked pages the owner chose (`extraPages`, same site).
	 * Files used by several pages travel once. `includeFiles: false` gives a small layout-only file.
	 */
	const buildForPage = async ({
		page,
		extraPages = [],
		includeFiles,
	}: {
		page: PageRow;
		extraPages?: PageRow[];
		includeFiles: boolean;
	}): Promise<PagePackage> => {
		const siteId = String(page.siteId);
		const main = toPackagePage(page);
		const extras = extraPages.map(toPackagePage);
		const siteMedia = await listSiteMedia(siteId);
		const mediaByUrl = new Map(siteMedia.map((item) => [item.url, item]));

		const refs = findUploadRefs({
			value: [main, ...extras],
			knownUrls: siteMedia.map((item) => item.url),
		});
		const files: PackageFile[] = [];
		for (const ref of refs) {
			files.push(await packFile({ ref, row: mediaByUrl.get(ref), includeFiles }));
		}

		const theme = await readActiveTheme(siteId);
		const carried = includeFiles
			? await packExternalFonts({
					value: { blocks: main.blocks, extras, theme, other: main.other, featuredImage: main.featuredImage },
					readRemote,
					uploadLimit,
				})
			: {
					value: { blocks: main.blocks, extras, theme, other: main.other, featuredImage: main.featuredImage },
					files: [] as PackageFile[],
				};
		const packed = carried.value;
		return {
			format: PAGE_PACKAGE_FORMAT,
			formatVersion: PAGE_PACKAGE_VERSION,
			appVersion,
			createdAt: new Date().toISOString(),
			source: "export",
			page: {
				title: main.title,
				slug: main.slug,
				featuredImage: packed.featuredImage,
				other: packed.other,
			},
			blocks: packed.blocks,
			...(packed.extras.length > 0 ? { extraPages: packed.extras } : {}),
			files: [...files, ...carried.files],
			...(packed.theme ? { theme: packed.theme } : {}),
		};
	};

	return { buildForPage };
}

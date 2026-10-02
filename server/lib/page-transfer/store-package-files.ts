import path from "node:path";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import type { Media } from "@shared/schema-types";
import { sanitizeSvgMarkup, SVG_FILE_MAX_BYTES } from "@shared/icon-drawing";
import {
	buildPlaceholderSvg,
	LEFT_OUT_REASONS,
	type PackageFile,
	type StoredPackageFiles,
} from "@shared/page-transfer";

/** File types → the extension written to disk. A package never picks its own extension. */
const EXTENSION_BY_MIME: Record<string, string> = {
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/gif": ".gif",
	"image/webp": ".webp",
	"image/svg+xml": ".svg",
	"image/svg": ".svg",
	"video/mp4": ".mp4",
	"video/webm": ".webm",
	"audio/mp3": ".mp3",
	"audio/wav": ".wav",
	"application/pdf": ".pdf",
	"text/plain": ".txt",
	"font/woff": ".woff",
	"font/woff2": ".woff2",
	"font/ttf": ".ttf",
	"font/otf": ".otf",
};

const SVG_MIME_TYPES = new Set(["image/svg+xml", "image/svg"]);

type MediaModel = {
	findManyWhere: (where: { where: string; equals: unknown }[]) => Promise<Media[]>;
	create: (data: {
		filename: string;
		originalName: string;
		mimeType: string;
		size: number;
		url: string;
		siteId: string;
		authorId: string;
		alt?: string;
		caption?: string;
	}) => Promise<Media>;
};

type FileBytes = { ok: true; bytes: Buffer; mimeType: string } | { ok: false; reason: string };

/** Lowercase, dashes, no dots or slashes: a stored name can never leave the uploads folder. */
const safeBaseName = (name: string): string =>
	path
		.basename(name, path.extname(name))
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60) || "file";

/**
 * Stores the files that came with a page package on this site.
 * Every file is checked like a normal upload (allowed type, size limit, SVG cleaned).
 * A file identical to one already in the media library is reused, so importing twice does
 * not fill the library with copies. A file that did not travel or is refused becomes a named
 * placeholder picture, so the layout keeps its shape and the summary says what to put back.
 */
export function createPackageFileStore({
	media,
	uploadDir,
	allowedMimeTypes,
	uploadLimit,
	onFileStored,
}: {
	media: MediaModel;
	uploadDir: string;
	allowedMimeTypes: readonly string[];
	uploadLimit: number;
	onFileStored?: (item: Media) => void;
}) {
	const readBytes = (file: PackageFile): FileBytes => {
		if (file.leftOut) return { ok: false, reason: LEFT_OUT_REASONS[file.leftOut] };
		if (!file.data) return { ok: false, reason: LEFT_OUT_REASONS["not-found"] };
		if (!allowedMimeTypes.includes(file.mimeType) || !EXTENSION_BY_MIME[file.mimeType]) {
			return { ok: false, reason: "this file type isn't allowed on this site" };
		}
		const bytes = Buffer.from(file.data, "base64");
		if (bytes.length > uploadLimit) return { ok: false, reason: LEFT_OUT_REASONS["too-large"] };
		if (!SVG_MIME_TYPES.has(file.mimeType)) return { ok: true, bytes, mimeType: file.mimeType };

		if (bytes.length > SVG_FILE_MAX_BYTES) return { ok: false, reason: "this SVG is too large to clean safely" };
		const cleaned = sanitizeSvgMarkup(bytes.toString("utf8"));
		if (!cleaned.ok) return { ok: false, reason: "this SVG couldn't be cleaned, so it was skipped" };
		return { ok: true, bytes: Buffer.from(cleaned.svg, "utf8"), mimeType: "image/svg+xml" };
	};

	/** Same name, same size and the same bytes on disk → the same file. */
	const findIdentical = async ({
		siteId,
		originalName,
		bytes,
	}: {
		siteId: string;
		originalName: string;
		bytes: Buffer;
	}): Promise<Media | null> => {
		const candidates = await media.findManyWhere([
			{ where: "siteId", equals: siteId },
			{ where: "originalName", equals: originalName },
			{ where: "size", equals: bytes.length },
		]);
		for (const candidate of candidates) {
			const onDisk = await fs.readFile(path.join(uploadDir, path.basename(candidate.filename))).catch(() => null);
			if (onDisk?.equals(bytes)) return candidate;
		}
		return null;
	};

	const saveNew = async ({
		siteId,
		authorId,
		originalName,
		mimeType,
		bytes,
		alt,
		caption,
	}: {
		siteId: string;
		authorId: string;
		originalName: string;
		mimeType: string;
		bytes: Buffer;
		alt?: string;
		caption?: string;
	}): Promise<Media> => {
		const filename = `${safeBaseName(originalName)}-${Date.now()}-${randomBytes(4).toString("hex")}${EXTENSION_BY_MIME[mimeType]}`;
		await fs.writeFile(path.join(uploadDir, filename), bytes, { flag: "wx" });
		const item = await media.create({
			filename,
			originalName,
			mimeType,
			size: bytes.length,
			url: `/uploads/${filename}`,
			siteId,
			authorId,
			...(alt ? { alt } : {}),
			...(caption ? { caption } : {}),
		});
		onFileStored?.(item);
		return item;
	};

	const storeOrReuse = async (params: Parameters<typeof saveNew>[0]): Promise<{ item: Media; reused: boolean }> => {
		const existing = await findIdentical(params);
		if (existing) return { item: existing, reused: true };
		return { item: await saveNew(params), reused: false };
	};

	/** Stores every file of a package for one site and returns where each old path now points. */
	const storeFiles = async ({
		files,
		siteId,
		authorId,
	}: {
		files: readonly PackageFile[];
		siteId: string;
		authorId: string;
	}): Promise<StoredPackageFiles> => {
		const result: StoredPackageFiles = { refMap: {}, added: [], reused: [], missing: [] };

		// One after another: a page has tens of files, and parallel disk writes of large
		// videos gain little while making a failure harder to follow.
		for (const file of files) {
			const read = readBytes(file);
			if (read.ok) {
				const { item, reused } = await storeOrReuse({
					siteId,
					authorId,
					originalName: file.name,
					mimeType: read.mimeType,
					bytes: read.bytes,
					alt: file.alt,
					caption: file.caption,
				});
				result.refMap[file.ref] = item.url;
				(reused ? result.reused : result.added).push(file.name);
				continue;
			}

			const placeholder = await storeOrReuse({
				siteId,
				authorId,
				originalName: `missing-${safeBaseName(file.name)}.svg`,
				mimeType: "image/svg+xml",
				bytes: Buffer.from(buildPlaceholderSvg({ name: file.name }), "utf8"),
				alt: `Missing file: ${file.name}`,
			});
			result.refMap[file.ref] = placeholder.item.url;
			result.missing.push({ name: file.name, reason: read.reason });
		}
		return result;
	};

	return { storeFiles };
}

export type PackageFileStore = ReturnType<typeof createPackageFileStore>;

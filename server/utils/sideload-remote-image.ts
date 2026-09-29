import path from "node:path";
import { promises as fs } from "node:fs";
import { validateExternalUrl } from "./validate-external-url";
import { sanitizeSvgMarkup } from "@shared/icon-drawing";

const IMAGE_MIME_BY_EXT: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
};

const guessMime = (filename: string, contentType: string | null): string | null => {
	if (contentType && contentType.startsWith("image/")) return contentType.split(";")[0];
	const ext = path.extname(filename).toLowerCase();
	return IMAGE_MIME_BY_EXT[ext] ?? null;
};

export type SideloadRemoteImageParams = {
	imageUrl: string;
	uploadDir: string;
	allowedMimeTypes: readonly string[];
	maxSize: number;
	/** Start of the saved file name. Defaults to `wp-import` (the WordPress importer). */
	filenamePrefix?: string;
};

export type SideloadRemoteImageResult =
	| {
			ok: true;
			filename: string;
			url: string;
			mimeType: string;
			size: number;
			originalName: string;
	  }
	| { ok: false; message: string };

/**
 * Downloads a remote image into the uploads directory (WordPress import copy mode, brand logos).
 * SVG files are cleaned before they are written, so a downloaded drawing can never run code.
 */
export const sideloadRemoteImage = async (
	params: SideloadRemoteImageParams,
): Promise<SideloadRemoteImageResult> => {
	const validated = await validateExternalUrl(params.imageUrl);
	if (!validated.ok) {
		return { ok: false, message: validated.message };
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);

	try {
		const response = await fetch(params.imageUrl, {
			signal: controller.signal,
			redirect: "follow",
		});

		if (!response.ok) {
			return { ok: false, message: `Image fetch failed (${response.status})` };
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.length > params.maxSize) {
			return { ok: false, message: "Image exceeds maximum upload size" };
		}

		const urlPath = new URL(params.imageUrl).pathname;
		const originalName = path.basename(urlPath) || "imported-image.jpg";
		const ext = path.extname(originalName) || ".jpg";
		const mimeType = guessMime(originalName, response.headers.get("content-type"));

		if (!mimeType || !params.allowedMimeTypes.includes(mimeType)) {
			return { ok: false, message: "Image type is not allowed" };
		}

		let body = buffer;
		if (mimeType === "image/svg+xml") {
			const cleaned = sanitizeSvgMarkup(buffer.toString("utf8"));
			if (!cleaned.ok) {
				return { ok: false, message: `SVG was refused: ${cleaned.message}` };
			}
			body = Buffer.from(cleaned.svg, "utf8");
		}

		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const filename = `${params.filenamePrefix ?? "wp-import"}-${uniqueSuffix}${ext}`;
		const filePath = path.join(params.uploadDir, filename);

		await fs.writeFile(filePath, body);

		return {
			ok: true,
			filename,
			url: `/uploads/${filename}`,
			mimeType,
			size: body.length,
			originalName,
		};
	} catch (err: unknown) {
		return {
			ok: false,
			message: err instanceof Error ? err.message : "Failed to download image",
		};
	} finally {
		clearTimeout(timeout);
	}
};

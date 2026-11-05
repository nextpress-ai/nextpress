import { z } from "zod";
import { uuidSchema } from "./index.js";

/** The most linked pages one export can bring along (the server refuses more). */
export const MAX_INCLUDED_PAGES = 50;

export const pageTransferLinksSchema = z.object({
	pageId: uuidSchema,
});

export const exportPageSchema = z.object({
	pageId: uuidSchema,
	/** Leave images, videos and other files out when false. Default: include them. */
	files: z.boolean().optional(),
	/** Ids of linked pages (from `links`) that travel along with the main page. */
	include: z
		.array(uuidSchema)
		.max(MAX_INCLUDED_PAGES, { message: `Choose at most ${MAX_INCLUDED_PAGES} linked pages.` })
		.optional(),
});

const fileSize = (file: Blob | Uint8Array | string): number =>
	typeof file === "string" ? file.length : file instanceof Blob ? file.size : file.byteLength;

export const importPageSchema = z.object({
	file: z
		.union([z.instanceof(Blob), z.instanceof(Uint8Array), z.string()])
		.refine((file) => fileSize(file) > 0, { message: "The page file is empty." }),
	fileName: z.string().trim().min(1).max(255),
	/** Also bring the page file's theme, and make it the site's theme. Default: leave it out. */
	includeTheme: z.boolean().optional(),
	/** Make the imported pages live instead of drafts. */
	publish: z.boolean().optional(),
	siteId: z.string().uuid().optional(),
});

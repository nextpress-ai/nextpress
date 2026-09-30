import { z } from "zod";
import type { BlockConfig } from "../schema-types.js";
import { PAGE_PACKAGE_FORMAT, READABLE_PAGE_PACKAGE_VERSIONS, type PagePackage } from "./types.js";

const fileSchema = z.object({
	ref: z.string().startsWith("/uploads/").max(1024),
	name: z.string().min(1).max(255),
	mimeType: z.string().min(1).max(100),
	size: z.number().int().nonnegative(),
	alt: z.string().max(2000).optional(),
	caption: z.string().max(5000).optional(),
	data: z.string().optional(),
	leftOut: z.enum(["left-out", "not-in-clipboard", "too-large", "not-found"]).optional(),
});

/** Block shape is checked later by the same save rules as any edit; here only the essentials. */
const blockSchema = z.custom<BlockConfig>(
	(value) =>
		typeof value === "object" &&
		value !== null &&
		typeof (value as { id?: unknown }).id === "string" &&
		typeof (value as { name?: unknown }).name === "string",
);

/** Most linked pages one file may bring; a whole small site, not a whole large one. */
const MAX_EXTRA_PAGES = 50;

const pageSchema = z.object({
	title: z.string().min(1).max(500),
	slug: z.string().max(500),
	featuredImage: z.string().max(2048).nullable(),
	other: z.record(z.string(), z.any()),
});

const packageSchema = z.object({
	format: z.literal(PAGE_PACKAGE_FORMAT),
	formatVersion: z.union([z.literal(READABLE_PAGE_PACKAGE_VERSIONS[0]), z.literal(READABLE_PAGE_PACKAGE_VERSIONS[1])]),
	appVersion: z.string().max(50),
	createdAt: z.string().max(50),
	source: z.enum(["export", "clipboard"]),
	page: pageSchema.optional(),
	blocks: z.array(blockSchema).max(5000),
	extraPages: z
		.array(pageSchema.extend({ blocks: z.array(blockSchema).max(5000) }))
		.max(MAX_EXTRA_PAGES)
		.optional(),
	files: z.array(fileSchema).max(500),
	theme: z
		.object({
			name: z.string().min(1).max(200),
			description: z.string().max(2000).nullable(),
			settings: z.record(z.string(), z.any()),
		})
		.optional(),
});

export type ReadPagePackageResult = { ok: true; value: PagePackage } | { ok: false; message: string };

/** Cheap check before parsing: is this text a NextPress page package at all? */
export const looksLikePagePackage = (text: string): boolean =>
	text.trimStart().startsWith("{") && text.includes(`"${PAGE_PACKAGE_FORMAT}"`);

/**
 * Reads a page file or copied blocks. Anything that is not a NextPress page package is
 * refused with a message the owner can act on; block content itself is checked later by the
 * same save rules as any edit.
 */
export function readPagePackage(text: string): ReadPagePackageResult {
	if (!looksLikePagePackage(text)) {
		return { ok: false, message: "This isn't a NextPress page file." };
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		return { ok: false, message: `This page file is damaged and can't be read (${(error as Error).message}).` };
	}
	const parsed = packageSchema.safeParse(raw);
	if (!parsed.success) {
		const versionIssue = parsed.error.issues.some((issue) => issue.path[0] === "formatVersion");
		return {
			ok: false,
			message: versionIssue
				? "This page file was made by a newer NextPress. Update this site, then try again."
				: "This page file is incomplete or was changed by hand, so it can't be used.",
		};
	}
	return {
		ok: true,
		value: parsed.data,
	};
}

import type { BlockConfig } from "../schema-types.js";

export const PAGE_PACKAGE_FORMAT = "nextpress-page" as const;
export const PAGE_PACKAGE_VERSION = 1 as const;

/** Why a file did not travel with the package. The file becomes a named placeholder. */
export type PackageFileLeftOut =
	/** Owner turned off "Include images, videos and other files" on export. */
	| "left-out"
	/** Clipboard carries images only, up to a size cap. */
	| "not-in-clipboard"
	/** Larger than the upload limit. */
	| "too-large"
	/** Referenced by a block but no longer in the media library or on disk. */
	| "not-found";

export type PackageFile = {
	/** The `/uploads/…` path blocks use on the source site. */
	ref: string;
	name: string;
	mimeType: string;
	size: number;
	alt?: string;
	caption?: string;
	/** File bytes as base64. Absent when the file was left out. */
	data?: string;
	leftOut?: PackageFileLeftOut;
};

export type PackagePage = {
	title: string;
	slug: string;
	featuredImage: string | null;
	other: Record<string, unknown>;
};

export type PackageTheme = {
	name: string;
	description: string | null;
	settings: Record<string, unknown>;
};

/** One page (or a set of copied blocks) with the files it uses, ready to move to another site. */
export type PagePackage = {
	format: typeof PAGE_PACKAGE_FORMAT;
	formatVersion: typeof PAGE_PACKAGE_VERSION;
	appVersion: string;
	createdAt: string;
	/** `export` = downloaded page file; `clipboard` = copied blocks. */
	source: "export" | "clipboard";
	page?: PackagePage;
	blocks: BlockConfig[];
	files: PackageFile[];
	theme?: PackageTheme;
};

/** What happened to each file when a package landed on a site. */
export type StoredPackageFiles = {
	/** Old `/uploads/…` path → new path on this site. */
	refMap: Record<string, string>;
	added: string[];
	reused: string[];
	/** Files that became placeholders, with the reason in plain words. */
	missing: { name: string; reason: string }[];
};

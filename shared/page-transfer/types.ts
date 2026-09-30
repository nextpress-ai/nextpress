import type { BlockConfig } from "../schema-types.js";

export const PAGE_PACKAGE_FORMAT = "nextpress-page" as const;
/** Written by this version. 2 added `extraPages` (linked pages that travel along). */
export const PAGE_PACKAGE_VERSION = 2 as const;
/** Every version this site can still read. */
export const READABLE_PAGE_PACKAGE_VERSIONS = [1, 2] as const;

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

/** A linked page that travels with the main page (its own title, address and blocks). */
export type PackageExtraPage = PackagePage & { blocks: BlockConfig[] };

export type PackageTheme = {
	name: string;
	description: string | null;
	settings: Record<string, unknown>;
};

/** One page (or a set of copied blocks) with the files it uses, ready to move to another site. */
export type PagePackage = {
	format: typeof PAGE_PACKAGE_FORMAT;
	formatVersion: (typeof READABLE_PAGE_PACKAGE_VERSIONS)[number];
	appVersion: string;
	createdAt: string;
	/** `export` = downloaded page file; `clipboard` = copied blocks. */
	source: "export" | "clipboard";
	page?: PackagePage;
	blocks: BlockConfig[];
	/** Pages the main page links to that the owner chose to bring along (file export only). */
	extraPages?: PackageExtraPage[];
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

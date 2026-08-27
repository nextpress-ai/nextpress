/**
 * Manifest construction and export-file validation.
 *
 * The manifest is the contract that lets a future NextPress version detect an
 * export it cannot read yet. Validation failures throw a humanized Error
 * BEFORE any database work happens — a bad file must never touch the DB.
 */
import { ENTITY_NAMES, type EntityName, type ExportFile, type ExportManifest, type SiteScope } from "./types.js";

export interface BuildManifestParams {
	appVersion: string;
	siteScope: SiteScope;
	entityCounts: Partial<Record<EntityName, number>>;
	includesMediaFiles: boolean;
}

/**
 * Build a manifest describing an export.
 * @param params - appVersion, siteScope, per-entity row counts, media flag
 * @returns A ready-to-serialize manifest
 */
export function buildManifest(params: BuildManifestParams): ExportManifest {
	return {
		format: "nextpress-export",
		formatVersion: 1,
		appVersion: params.appVersion,
		exportedAt: new Date().toISOString(),
		siteScope: params.siteScope,
		entityCounts: params.entityCounts,
		includesMediaFiles: params.includesMediaFiles,
	};
}

/**
 * Validate a parsed export file. Throws a humanized Error when the file is
 * not a NextPress export or was made by a newer format version.
 * @param value - The parsed JSON payload (unknown at the parse boundary)
 * @returns The validated export file
 */
export function validateExportFile(value: unknown): ExportFile {
	if (typeof value !== "object" || value === null) {
		throw new Error("This file is not a NextPress export.");
	}

	const file = value as Partial<ExportFile>;
	const manifest = file.manifest;
	if (typeof manifest !== "object" || manifest === null) {
		throw new Error("This file is not a NextPress export (it has no manifest).");
	}

	if (manifest.format !== "nextpress-export") {
		const seen = typeof manifest.format === "string" ? manifest.format : "unknown";
		throw new Error(`This file is not a NextPress export (format "${seen}").`);
	}

	if (manifest.formatVersion !== 1) {
		throw new Error(
			"This export was created by a newer version of NextPress and cannot be imported here. Please upgrade NextPress and try again.",
		);
	}

	if (typeof file.data !== "object" || file.data === null) {
		throw new Error("This export file has no data to import.");
	}

	for (const key of Object.keys(file.data)) {
		if (!ENTITY_NAMES.includes(key as EntityName)) {
			throw new Error(`This export file contains an unknown data section "${key}".`);
		}
	}

	return file as ExportFile;
}

/**
 * Detect the payload format from its leading bytes.
 * Gzip archives start with the magic bytes 1f 8b; everything else is JSON.
 * @param buffer - Raw payload bytes (export JSON or .tar.gz)
 * @returns "targz" for gzip archives, "json" otherwise
 */
export function detectFormat(buffer: Buffer): "json" | "targz" {
	return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b ? "targz" : "json";
}
/**
 * Media file bundling — packs/unpacks the `.tar.gz` payload that carries
 * `export.json` plus the media binaries from `uploads/`.
 *
 * Uses the system `tar` via child_process (busybox tar in the node:24-alpine
 * container, gnu/bsd tar on dev machines) with only portable flags
 * (`-czf`, `-xzf`, `-C`). No npm tar dependency.
 *
 * Media rows whose file is missing on disk are skipped with a warning — the
 * row stays in the export, the file just does not travel.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateExportFile } from "./manifest.js";
import type { ExportFile, ImportMode } from "./types.js";

/** Safe file name for a media row — never lets a stored filename escape the upload dir. */
function mediaFileName(filename: string): string {
	return path.basename(filename);
}

function runTar(args: string[]): void {
	const result = spawnSync("tar", args, { encoding: "utf8" });
	if (result.error) {
		throw new Error(`Could not run tar: ${result.error.message}`);
	}
	if (result.status !== 0) {
		const detail = (result.stderr ?? "").trim();
		throw new Error(`tar failed (${result.status}): ${detail || "unknown error"}`);
	}
}

function makeTempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempDir(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Pack an export file plus its media binaries into a .tar.gz buffer.
 * @param exportFile - The export to bundle
 * @param uploadDir - Directory holding the media binaries (process.cwd()/uploads)
 * @returns The .tar.gz payload as a Buffer
 */
export async function packExport(exportFile: ExportFile, uploadDir: string): Promise<Buffer> {
	const tempDir = makeTempDir("nextpress-export-");
	const archivePath = path.join(os.tmpdir(), `nextpress-export-${process.pid}-${Date.now()}.tar.gz`);
	try {
		fs.writeFileSync(path.join(tempDir, "export.json"), JSON.stringify(exportFile));

		const mediaRows = exportFile.data.media ?? [];
		if (mediaRows.length > 0) {
			fs.mkdirSync(path.join(tempDir, "media"), { recursive: true });
			for (const row of mediaRows) {
				const fileName = mediaFileName(row.filename);
				const sourcePath = path.join(uploadDir, fileName);
				if (!fs.existsSync(sourcePath)) {
					console.error(
						`[transfer] Media file missing for "${row.filename}" (id ${row.id}) — exporting the row without the file.`,
					);
					continue;
				}
				fs.copyFileSync(sourcePath, path.join(tempDir, "media", fileName));
			}
		}

		runTar(["-czf", archivePath, "-C", tempDir, "."]);
		return fs.readFileSync(archivePath);
	} finally {
		removeTempDir(tempDir);
		fs.rmSync(archivePath, { force: true });
	}
}

/**
 * Unpack a .tar.gz payload: restore media binaries into uploadDir and return
 * the parsed export file.
 * @param input - The .tar.gz Buffer, or a path to one
 * @param uploadDir - Where media binaries are restored (created if missing)
 * @param mode - "overwrite" replaces existing files, "skip" keeps them
 * @returns The parsed and validated export file
 */
export async function unpackExport(
	input: Buffer | string,
	uploadDir: string,
	mode: ImportMode,
): Promise<ExportFile> {
	const tempDir = makeTempDir("nextpress-import-");
	const archivePath =
		typeof input === "string" ? input : path.join(os.tmpdir(), `nextpress-import-${process.pid}-${Date.now()}.tar.gz`);
	try {
		if (typeof input === "string") {
			if (!fs.existsSync(input)) {
				throw new Error(`The archive file "${input}" does not exist.`);
			}
		} else {
			fs.writeFileSync(archivePath, input);
		}

		runTar(["-xzf", archivePath, "-C", tempDir]);

		const manifestPath = path.join(tempDir, "export.json");
		if (!fs.existsSync(manifestPath)) {
			throw new Error("This archive is not a NextPress export (it has no export.json inside).");
		}
		const raw = fs.readFileSync(manifestPath, "utf8");
		const exportFile = validateExportFile(JSON.parse(raw));

		const mediaRows = exportFile.data.media ?? [];
		if (mediaRows.length > 0) {
			fs.mkdirSync(uploadDir, { recursive: true });
			for (const row of mediaRows) {
				const fileName = mediaFileName(row.filename);
				const sourcePath = path.join(tempDir, "media", fileName);
				if (!fs.existsSync(sourcePath)) continue;
				const destPath = path.join(uploadDir, fileName);
				if (mode === "skip" && fs.existsSync(destPath)) continue;
				fs.copyFileSync(sourcePath, destPath);
			}
		}

		return exportFile;
	} finally {
		removeTempDir(tempDir);
		if (typeof input !== "string") {
			fs.rmSync(archivePath, { force: true });
		}
	}
}
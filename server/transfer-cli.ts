/**
 * In-container runner for data export/import. Invoked by the shipped bash CLI
 * (`scripts/nextpress`) via `docker compose exec -T app node dist/transfer-cli.js ...`.
 *
 * Export streams the payload (JSON or .tar.gz) to STDOUT — all logs and the
 * summary go to STDERR so the pipe stays clean. Import reads the payload from
 * STDIN (binary-safe), auto-detects the format from the magic bytes, and
 * prints a human summary to STDOUT. Exit code 0 = ok, 1 = error.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { models } from "./storage.js";
import { pool } from "./db.js";
import { readInstalledAppVersion } from "./config.js";
import { createTransferExporter } from "./transfer/export-data.js";
import { createTransferImporter, IMPORT_ORDER } from "./transfer/import-data.js";
import { packExport, unpackExport } from "./transfer/tar-bundle.js";
import { detectFormat, validateExportFile } from "./transfer/manifest.js";
import {
	ENTITY_NAMES,
	type EntityName,
	type ExportFile,
	type ImportMode,
	type ImportSummary,
} from "./transfer/types.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const USAGE = `Usage:
  nextpress export [--entities users,sites,...] [--site <name>] [--with-media-files] [--out <file>]
  nextpress import [--entities users,sites,...] [--mode overwrite|skip] < <file>

Entities: ${ENTITY_NAMES.join(", ")}`;

interface ParsedArgs {
	command: "export" | "import";
	entities?: EntityName[];
	siteSlug?: string;
	withMediaFiles: boolean;
	outPath?: string;
	mode: ImportMode;
}

type ParseResult = { ok: true; args: ParsedArgs } | { ok: false; error: string };

/** Hand-rolled argv parser — no commander dependency. */
function parseArgs(argv: string[]): ParseResult {
	const command = argv[0];
	if (command !== "export" && command !== "import") {
		return {
			ok: false,
			error: `Unknown command "${command ?? ""}". Use "export" or "import".`,
		};
	}

	const args: ParsedArgs = { command, withMediaFiles: false, mode: "overwrite" };
	const allowedFlags =
		command === "export"
			? new Set(["--entities", "--site", "--with-media-files", "--out"])
			: new Set(["--entities", "--mode"]);

	for (let i = 1; i < argv.length; i++) {
		const flag = argv[i];
		if (!flag.startsWith("--")) {
			return { ok: false, error: `Unexpected argument "${flag}".` };
		}
		if (!allowedFlags.has(flag)) {
			return { ok: false, error: `Unknown option "${flag}" for "${command}".` };
		}
		if (flag === "--with-media-files") {
			args.withMediaFiles = true;
			continue;
		}

		const value = argv[i + 1];
		if (value === undefined || value.startsWith("--")) {
			return { ok: false, error: `Option "${flag}" needs a value.` };
		}
		i += 1;

		if (flag === "--entities") {
			const names = value
				.split(",")
				.map((name) => name.trim())
				.filter(Boolean);
			if (names.length === 0) {
				return { ok: false, error: `Option "--entities" needs at least one entity name.` };
			}
			for (const name of names) {
				if (!ENTITY_NAMES.includes(name as EntityName)) {
					return {
						ok: false,
						error: `Unknown entity "${name}". Valid entities: ${ENTITY_NAMES.join(", ")}.`,
					};
				}
			}
			args.entities = names as EntityName[];
			continue;
		}
		if (flag === "--site") {
			args.siteSlug = value;
			continue;
		}
		if (flag === "--out") {
			args.outPath = value;
			continue;
		}
		if (flag === "--mode") {
			if (value !== "overwrite" && value !== "skip") {
				return { ok: false, error: `Invalid mode "${value}". Use "overwrite" or "skip".` };
			}
			args.mode = value;
		}
	}

	return { ok: true, args };
}

/**
 * Write to stdout and wait for the flush to complete. Large payloads (a full
 * export, or an import summary) can exceed the pipe buffer; calling
 * `process.exit()` before the write drains truncates them. Resolving on the
 * write callback lets the process drain naturally.
 */
function writeStdout(data: Buffer | string): Promise<void> {
	return new Promise((resolve, reject) => {
		process.stdout.write(data, (error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

function formatImportSummary(summary: ImportSummary): string {
	const lines = ["Import complete:"];
	for (const entity of IMPORT_ORDER) {
		const entry = summary[entity];
		if (!entry) continue;
		const failures = entry.errors.length > 0 ? `, ${entry.errors.length} failed` : "";
		lines.push(
			`  ${entity}: ${entry.created} created, ${entry.updated} updated, ${entry.skipped} skipped${failures}`,
		);
	}
	const totalErrors = Object.values(summary).reduce(
		(total, entry) => total + entry.errors.length,
		0,
	);
	if (totalErrors > 0) {
		lines.push(`Errors: ${totalErrors} row(s) could not be imported — see the error output above.`);
	}
	return lines.join("\n");
}

async function runExport(args: ParsedArgs): Promise<number> {
	const exporter = createTransferExporter({
		models,
		appVersion: readInstalledAppVersion(),
		log: console.error,
	});
	const exportFile = await exporter.exportData({
		entities: args.entities,
		siteSlug: args.siteSlug,
	});

	const payload = args.withMediaFiles
		? await packExport(
				{ ...exportFile, manifest: { ...exportFile.manifest, includesMediaFiles: true } },
				UPLOAD_DIR,
			)
		: Buffer.from(JSON.stringify(exportFile, null, 2), "utf8");

	if (args.outPath) {
		fs.writeFileSync(args.outPath, payload);
		console.error(`[transfer] Export written to ${args.outPath}`);
	} else {
		await writeStdout(payload);
	}
	return 0;
}

async function runImport(args: ParsedArgs): Promise<number> {
	const input = fs.readFileSync(0);
	if (input.length === 0) {
		console.error(
			"[transfer] No data received on stdin. Pipe an export file in, e.g. nextpress export | nextpress import.",
		);
		return 1;
	}

	let exportFile: ExportFile;
	if (detectFormat(input) === "targz") {
		exportFile = await unpackExport(input, UPLOAD_DIR, args.mode);
	} else {
		let parsed: unknown;
		try {
			parsed = JSON.parse(input.toString("utf8"));
		} catch {
			console.error("[transfer] The input is not a valid NextPress export (not JSON, not a .tar.gz archive).");
			return 1;
		}
		exportFile = validateExportFile(parsed);
	}

	const importer = createTransferImporter({ models, log: console.error });
	const summary = await importer.importData({
		exportFile,
		entities: args.entities,
		mode: args.mode,
	});
	await writeStdout(formatImportSummary(summary));
	return 0;
}

async function main(): Promise<number> {
	const parsed = parseArgs(process.argv.slice(2));
	if (!parsed.ok) {
		console.error(`[transfer] ${parsed.error}`);
		console.error(USAGE);
		return 1;
	}
	return parsed.args.command === "export" ? runExport(parsed.args) : runImport(parsed.args);
}

/** True only when invoked as `node dist/transfer-cli.js`, not when bundled elsewhere. */
function isTransferCliEntry(): boolean {
	const entry = process.argv[1];
	if (!entry) {
		return false;
	}
	return /transfer-cli\.(js|ts|mjs|cjs)$/.test(entry);
}

/**
 * Close the DB pool so the process exits promptly instead of lingering on the
 * pg idle timeout. A failure here is logged but never masks the real result —
 * the caller's exit code stands.
 */
async function closeDbPool(): Promise<void> {
	if (!pool) return;
	try {
		await pool.end();
	} catch (error) {
		console.error(
			`[transfer] Failed to close the database pool: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

if (isTransferCliEntry()) {
	main()
		.then(async (code) => {
			process.exitCode = code;
			await closeDbPool();
		})
		.catch(async (error: unknown) => {
			const message = error instanceof Error ? error.message : String(error);
			const cause = error && typeof error === "object" && "cause" in error ? (error as { cause: unknown }).cause : undefined;
			const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
			console.error(`[transfer] Export or import failed: ${causeMsg ?? message}`);
			process.exitCode = 1;
			await closeDbPool();
		});
}
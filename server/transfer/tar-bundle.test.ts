/**
 * Tar bundle tests — pack/unpack round trip with a real fixture file in a
 * temp upload dir, missing-file handling, skip vs overwrite file modes, and
 * rejection of archives that are not NextPress exports.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTransferExporter } from "./export-data.js";
import { detectFormat } from "./manifest.js";
import { packExport, unpackExport } from "./tar-bundle.js";
import { buildTestModels, seedFixture, wipeAll } from "./test-fixtures.js";

const models = buildTestModels();
const exporter = createTransferExporter({ models, appVersion: "1.0.0-test", log: () => {} });

const tempDirs: string[] = [];

function makeTempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nextpress-test-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

beforeEach(async () => {
	await wipeAll();
	await seedFixture(models);
});

describe("tar bundle", () => {
	it("packs and unpacks a bundle with a real media file", async () => {
		const uploadDir = makeTempDir();
		const targetDir = makeTempDir();
		const fileBytes = Buffer.from("fake image bytes");
		fs.writeFileSync(path.join(uploadDir, "fixture-image.png"), fileBytes);

		const exportFile = await exporter.exportData({});
		const bundle = await packExport(exportFile, uploadDir);
		expect(detectFormat(bundle)).toBe("targz");

		const restored = await unpackExport(bundle, targetDir, "overwrite");
		expect(restored.manifest.format).toBe("nextpress-export");
		expect(restored.data.media?.length).toBe(2);
		expect(fs.readFileSync(path.join(targetDir, "fixture-image.png")).equals(fileBytes)).toBe(true);
	});

	it("warns and skips media rows whose file is missing, keeping the row", async () => {
		const uploadDir = makeTempDir();
		const targetDir = makeTempDir();
		const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			const exportFile = await exporter.exportData({});
			const bundle = await packExport(exportFile, uploadDir);
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining("Media file missing"),
			);

			const restored = await unpackExport(bundle, targetDir, "overwrite");
			expect(restored.data.media?.length).toBe(2);
			expect(fs.existsSync(path.join(targetDir, "fixture-image.png"))).toBe(false);
		} finally {
			warnSpy.mockRestore();
		}
	});

	it("skip mode keeps existing files; overwrite replaces them", async () => {
		const uploadDir = makeTempDir();
		const targetDir = makeTempDir();
		const original = Buffer.from("original bytes");
		const replacement = Buffer.from("replacement bytes");
		fs.writeFileSync(path.join(uploadDir, "fixture-image.png"), replacement);
		fs.writeFileSync(path.join(targetDir, "fixture-image.png"), original);

		const exportFile = await exporter.exportData({});
		const bundle = await packExport(exportFile, uploadDir);

		await unpackExport(bundle, targetDir, "skip");
		expect(fs.readFileSync(path.join(targetDir, "fixture-image.png")).equals(original)).toBe(true);

		await unpackExport(bundle, targetDir, "overwrite");
		expect(fs.readFileSync(path.join(targetDir, "fixture-image.png")).equals(replacement)).toBe(true);
	});

	it("unpacks from a file path", async () => {
		const uploadDir = makeTempDir();
		const targetDir = makeTempDir();
		const archivePath = path.join(makeTempDir(), "export.tar.gz");
		fs.writeFileSync(path.join(uploadDir, "fixture-image.png"), Buffer.from("bytes"));

		const exportFile = await exporter.exportData({});
		const bundle = await packExport(exportFile, uploadDir);
		fs.writeFileSync(archivePath, bundle);

		const restored = await unpackExport(archivePath, targetDir, "overwrite");
		expect(restored.data.media?.length).toBe(2);
		expect(fs.existsSync(path.join(targetDir, "fixture-image.png"))).toBe(true);
	});

	it("rejects an archive that is not a NextPress export", async () => {
		const targetDir = makeTempDir();
		await expect(unpackExport(Buffer.from("not a tar archive"), targetDir, "overwrite")).rejects.toThrow();
	});
});
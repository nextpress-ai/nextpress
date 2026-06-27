import { describe, it, expect } from "vitest";
import { evaluateUpgrade } from "./evaluate-upgrade";
import type { NextpressConfig } from "./nextpress-config";
import { isSemverNewer } from "./semver";

const targetConfig: NextpressConfig = {
	schemaVersion: "2026.06.21.001",
	previousSchemaVersion: "2026.04.28.001",
	schemaPath: "shared/schema.ts",
	hasSchemaChanges: true,
};

describe("isSemverNewer", () => {
	it("detects patch upgrades", () => {
		expect(isSemverNewer({ current: "1.0.12", candidate: "1.0.13" })).toBe(true);
		expect(isSemverNewer({ current: "1.0.13", candidate: "1.0.12" })).toBe(false);
	});
});

describe("evaluateUpgrade", () => {
	it("marks 1.0.12 → 1.0.13 as update available with schema-compatible production path", () => {
		const assessment = evaluateUpgrade({
			nodeEnv: "production",
			installDir: "/opt/nextpress",
			installConfig: {
				schemaVersion: "2026.04.28.001",
				previousSchemaVersion: "legacy",
				schemaPath: "shared/schema.ts",
				hasSchemaChanges: true,
			},
			targetConfig,
			installedVersion: "1.0.12",
			latestVersion: "1.0.13",
			autoUpgradeEnabled: true,
			dockerSocketAccessible: true,
			nextpressCliPath: "/usr/local/bin/nextpress",
		});

		expect(assessment.updateAvailable).toBe(true);
		expect(assessment.schema.compatible).toBe(true);
		expect(assessment.canAutoUpgrade).toBe(true);
		expect(assessment.mode).toBe("auto");
	});

	it("falls back to manual instructions in development", () => {
		const assessment = evaluateUpgrade({
			nodeEnv: "development",
			installDir: null,
			installConfig: null,
			targetConfig,
			installedVersion: "1.0.12",
			latestVersion: "1.0.13",
			autoUpgradeEnabled: false,
			dockerSocketAccessible: false,
			nextpressCliPath: null,
		});

		expect(assessment.mode).toBe("manual");
		expect(assessment.canAutoUpgrade).toBe(false);
		expect(assessment.instructions.length).toBeGreaterThan(0);
	});
});

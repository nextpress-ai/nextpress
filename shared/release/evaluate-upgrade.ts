import type { NextpressConfig } from "./nextpress-config";
import { isSemverNewer } from "./semver";

export type UpgradeEnvironment = {
	nodeEnv: string;
	installDir: string | null;
	installConfig: NextpressConfig | null;
	targetConfig: NextpressConfig;
	installedVersion: string;
	latestVersion: string;
	autoUpgradeEnabled: boolean;
	dockerSocketAccessible: boolean;
	nextpressCliPath: string | null;
};

export type UpgradeAssessment = {
	updateAvailable: boolean;
	installedVersion: string;
	latestVersion: string;
	mode: "auto" | "manual";
	canAutoUpgrade: boolean;
	schema: {
		installed: string | null;
		target: string;
		previousRequired: string;
		compatible: boolean;
		hasSchemaChanges: boolean;
	};
	blockers: string[];
	instructions: string[];
	command: string;
};

const buildManualInstructions = (params: {
	latestVersion: string;
	hasSchemaChanges: boolean;
}): string[] => {
	const lines = [
		"Open a terminal on the host machine (SSH or local shell) — not inside the app container.",
		`Run: nextpress upgrade --version ${params.latestVersion}`,
		"The CLI backs up your database when schema migrations are required, then restarts services.",
		"See docs/upgrade-flow.md in the repo for override mode and troubleshooting.",
	];
	if (params.hasSchemaChanges) {
		lines.splice(
			2,
			0,
			"This release includes database migrations — allow a few minutes and ensure ≥1 GB free disk on the install path.",
		);
	}
	return lines;
};

/**
 * Determines whether an in-app auto upgrade is safe and how the user should proceed otherwise.
 * Auto upgrade only runs when the host exposes Docker + install dir to the app process.
 */
export const evaluateUpgrade = (env: UpgradeEnvironment): UpgradeAssessment => {
	const updateAvailable = isSemverNewer({
		current: env.installedVersion,
		candidate: env.latestVersion,
	});

	const installedSchema = env.installConfig?.schemaVersion ?? null;
	const schemaCompatible =
		!env.installConfig ||
		env.installConfig.schemaVersion === env.targetConfig.schemaVersion ||
		env.installConfig.schemaVersion === env.targetConfig.previousSchemaVersion;

	const blockers: string[] = [];

	if (env.nodeEnv !== "production") {
		blockers.push("In-app auto-upgrade is disabled in development — use git pull and pnpm dev locally.");
	}
	if (!env.installDir) {
		blockers.push("NEXTPRESS_INSTALL_DIR is not configured for this instance.");
	}
	if (!env.installConfig) {
		blockers.push("Installed nextpress.config.json was not found — cannot verify schema compatibility.");
	}
	if (!schemaCompatible) {
		blockers.push(
			`Schema chain mismatch: install is on ${installedSchema ?? "unknown"}, but ${env.latestVersion} expects previous schema ${env.targetConfig.previousSchemaVersion}.`,
		);
	}
	if (!env.autoUpgradeEnabled) {
		blockers.push("Set NEXTPRESS_AUTO_UPGRADE=true on the host to allow in-app auto upgrades.");
	}
	if (!env.dockerSocketAccessible) {
		blockers.push(
			"Docker socket is not mounted in this container — run nextpress upgrade on the host (that command pulls the image; we do not ping Docker Hub from the admin UI).",
		);
	}
	if (!env.nextpressCliPath) {
		blockers.push("nextpress CLI script was not found on PATH or in the install directory.");
	}

	const canAutoUpgrade = updateAvailable && blockers.length === 0;
	const command = `nextpress upgrade --version ${env.latestVersion}`;

	return {
		updateAvailable,
		installedVersion: env.installedVersion,
		latestVersion: env.latestVersion,
		mode: canAutoUpgrade ? "auto" : "manual",
		canAutoUpgrade,
		schema: {
			installed: installedSchema,
			target: env.targetConfig.schemaVersion,
			previousRequired: env.targetConfig.previousSchemaVersion,
			compatible: schemaCompatible,
			hasSchemaChanges: env.targetConfig.hasSchemaChanges,
		},
		blockers,
		instructions: buildManualInstructions({
			latestVersion: env.latestVersion,
			hasSchemaChanges: env.targetConfig.hasSchemaChanges,
		}),
		command,
	};
};

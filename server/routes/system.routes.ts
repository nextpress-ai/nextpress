import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { Router, type Request, type Response } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import { evaluateUpgrade } from "@shared/release/evaluate-upgrade";
import {
	fetchLatestReleaseVersion,
	isUpdateAvailable,
	type LatestVersionLookup,
} from "@shared/release/fetch-latest-version";
import { RELEASE_MANIFEST } from "@shared/release/release-manifest";
import { parseNextpressConfig } from "@shared/release/nextpress-config";
import {
	getAutoUpgradeEnabled,
	getNextpressInstallDir,
	readInstalledAppVersion,
} from "../config";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const readJsonFile = (filePath: string): unknown | null => {
	if (!fs.existsSync(filePath)) return null;
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
	} catch {
		return null;
	}
};

const readTargetConfig = () => {
	const parsed = parseNextpressConfig(readJsonFile(path.join(repoRoot, "nextpress.config.json")));
	if (!parsed.ok) {
		throw new Error(parsed.reason);
	}
	return parsed.config;
};

const readInstallConfig = (installDir: string | null) => {
	if (!installDir) return null;
	const parsed = parseNextpressConfig(
		readJsonFile(path.join(installDir, "nextpress.config.json")),
	);
	return parsed.ok ? parsed.config : null;
};

const resolveNextpressCliPath = (installDir: string | null): string | null => {
	const candidates = [
		process.env.NEXTPRESS_CLI_PATH?.trim(),
		installDir ? path.join(installDir, "nextpress") : null,
		path.join(repoRoot, "scripts", "nextpress"),
		"/usr/local/bin/nextpress",
	].filter((value): value is string => !!value);

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
};

const runUpgradeCommand = (params: {
	cliPath: string;
	installDir: string;
	version: string;
}): Promise<{ ok: boolean; output: string; code: number | null }> =>
	new Promise((resolve) => {
		const child = spawn(
			params.cliPath,
			["upgrade", "--version", params.version],
			{
				cwd: params.installDir,
				env: process.env,
			},
		);

		let output = "";
		child.stdout.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});
		child.on("close", (code) => {
			resolve({ ok: code === 0, output, code });
		});
	});

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedLatest: { expiresAt: number; value: LatestVersionLookup } | null = null;

const resolveLatestVersion = async (): Promise<LatestVersionLookup> => {
	const now = Date.now();
	if (cachedLatest && cachedLatest.expiresAt > now) {
		return cachedLatest.value;
	}

	const value = await fetchLatestReleaseVersion({
		fallbackVersion: RELEASE_MANIFEST.version,
	});
	cachedLatest = { expiresAt: now + CACHE_TTL_MS, value };
	return value;
};

/**
 * Release info and upgrade assessment for the admin UI.
 *
 * GET  /api/system/release
 * POST /api/system/upgrade/check
 * POST /api/system/upgrade/run
 */
export function createSystemRoutes(deps: Deps): Router {
	const router = Router();
	const { requireAuth, authService } = deps;

	const requireAdmin = async (req: Request, res: Response): Promise<string | null> => {
		const userId = authService.getCurrentUserId(req);
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return null;
		}
		return userId;
	};

	router.get(
		"/release",
		requireAuth,
		asyncHandler(async (_req, res) => {
			const installedVersion = readInstalledAppVersion();
			const latest = await resolveLatestVersion();

			res.json({
				installedVersion,
				latestVersion: latest.latestVersion,
				updateAvailable: isUpdateAvailable({
					installedVersion,
					latestVersion: latest.latestVersion,
				}),
				updateCheck: {
					source: latest.source,
					ok: latest.checkOk,
					note: latest.checkNote,
					checkedAt: latest.checkedAt,
				},
				releaseDate: RELEASE_MANIFEST.releaseDate,
				highlights: RELEASE_MANIFEST.highlights,
				supportedUpgradeFrom: RELEASE_MANIFEST.supportedUpgradeFrom,
			});
		}),
	);

	router.post(
		"/upgrade/check",
		requireAuth,
		asyncHandler(async (req, res) => {
			if (!(await requireAdmin(req, res))) return;

			const installedVersion = readInstalledAppVersion();
			const latest = await resolveLatestVersion();
			const latestVersion = latest.latestVersion;
			const installDir = getNextpressInstallDir();
			const assessment = evaluateUpgrade({
				nodeEnv: process.env.NODE_ENV ?? "development",
				installDir,
				installConfig: readInstallConfig(installDir),
				targetConfig: readTargetConfig(),
				installedVersion,
				latestVersion,
				autoUpgradeEnabled: getAutoUpgradeEnabled(),
				dockerSocketAccessible: fs.existsSync("/var/run/docker.sock"),
				nextpressCliPath: resolveNextpressCliPath(installDir),
			});

			res.json(assessment);
		}),
	);

	router.post(
		"/upgrade/run",
		requireAuth,
		asyncHandler(async (req, res) => {
			if (!(await requireAdmin(req, res))) return;

			const installDir = getNextpressInstallDir();
			const installedVersion = readInstalledAppVersion();
			const latest = await resolveLatestVersion();
			const latestVersion = latest.latestVersion;
			const assessment = evaluateUpgrade({
				nodeEnv: process.env.NODE_ENV ?? "development",
				installDir,
				installConfig: readInstallConfig(installDir),
				targetConfig: readTargetConfig(),
				installedVersion,
				latestVersion,
				autoUpgradeEnabled: getAutoUpgradeEnabled(),
				dockerSocketAccessible: fs.existsSync("/var/run/docker.sock"),
				nextpressCliPath: resolveNextpressCliPath(installDir),
			});

			if (!assessment.canAutoUpgrade) {
				return res.status(409).json({
					message: "Automatic upgrade is not available for this instance.",
					assessment,
				});
			}

			const cliPath = resolveNextpressCliPath(installDir);
			if (!cliPath || !installDir) {
				return res.status(500).json({ message: "Upgrade CLI path could not be resolved." });
			}

			const { err, result } = await safeTryAsync(async () =>
				runUpgradeCommand({
					cliPath,
					installDir,
					version: latestVersion,
				}),
			);

			if (err || !result) {
				return res.status(500).json({ message: "Upgrade command failed to start." });
			}

			if (!result.ok) {
				return res.status(500).json({
					message: "Upgrade command failed.",
					output: result.output,
					code: result.code,
					assessment,
				});
			}

			res.json({
				message: `Upgrade to ${latestVersion} completed.`,
				output: result.output,
				assessment,
			});
		}),
	);

	return router;
}

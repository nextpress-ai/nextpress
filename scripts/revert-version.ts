import path from "node:path";
import {
	formatSemver,
	parseSemver,
	revertVersion,
	type RevertKind,
} from "../shared/release/bump-version";
import { applyWorkspaceVersion, readWorkspaceVersion } from "./version-files";

const fail = (message: string): never => {
	console.error(message);
	process.exit(1);
};

const log = (message: string): void => {
	console.log(message);
};

const printUsage = (): void => {
	log(`Usage:
  pnpm version:revert                 Undo deploy bump (patch-1, or minor-1 patch 10 when patch is 0)
  pnpm version:revert --patch         Force patch revert
  pnpm version:revert --minor         Force minor revert (reset patch to 0)
  pnpm version:revert --major         Force major revert (reset minor/patch to 0)
  pnpm version:revert --set 1.2.0     Set an explicit semver
  pnpm version:set 1.2.0              Alias for --set (shared with version:bump)`);
};

const resolvePreviousVersion = (params: {
	current: string;
	args: string[];
}): string => {
	const { args, current } = params;

	if (args[0] === "--set" || args[0] === "set") {
		const target = args[1];
		if (!target || !parseSemver(target)) {
			fail(`Expected semver x.y.z after --set, got: "${target ?? ""}"`);
		}
		return formatSemver(parseSemver(target)!);
	}

	const kindByFlag: Record<string, RevertKind> = {
		"--patch": "patch",
		"--minor": "minor",
		"--major": "major",
		"--deploy": "deploy",
	};

	if (args[0] === "--help" || args[0] === "-h") {
		printUsage();
		process.exit(0);
	}

	const kind = args[0] ? (kindByFlag[args[0]] ?? "deploy") : "deploy";
	if (args[0] && !kindByFlag[args[0]] && args[0] !== "--set") {
		const direct = parseSemver(args[0]);
		if (direct) return formatSemver(direct);
		fail(`Unknown option: ${args[0]}`);
	}

	const previous = revertVersion({ current, kind });
	if (!previous) {
		fail(`Cannot revert version "${current}" with ${kind} rule`);
	}
	return previous;
};

/** CLI entry — reverts or sets semver across package.json, config.ts, and scripts/nextpress. */
const main = (): void => {
	const repoRoot = path.resolve(import.meta.dirname, "..");
	const currentResult = readWorkspaceVersion(repoRoot);
	if (!currentResult.status) fail(currentResult.message);

	const previousVersion = resolvePreviousVersion({
		current: currentResult.data,
		args: process.argv.slice(2),
	});

	const applyResult = applyWorkspaceVersion({ repoRoot, nextVersion: previousVersion });
	if (!applyResult.status) fail(applyResult.message);

	log(`Version reverted: ${currentResult.data} -> ${previousVersion}`);
	log("- updated: package.json");
	log("- updated: config.ts");
	log("- updated: scripts/nextpress");
};

main();

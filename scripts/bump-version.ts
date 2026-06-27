import fs from "node:fs";
import path from "node:path";
import {
	bumpDeployVersion,
	bumpVersion,
	formatSemver,
	parseSemver,
	type BumpKind,
} from "../shared/release/bump-version";

type Result<T> = { status: true; data: T } | { status: false; message: string };

const readText = (filePath: string): Result<string> => {
	try {
		return { status: true, data: fs.readFileSync(filePath, "utf8") };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { status: false, message: `Failed reading ${filePath}: ${message}` };
	}
};

const writeText = (filePath: string, text: string): Result<null> => {
	try {
		fs.writeFileSync(filePath, text, "utf8");
		return { status: true, data: null };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { status: false, message: `Failed writing ${filePath}: ${message}` };
	}
};

const updatePackageJsonVersion = (packageJsonPath: string, nextVersion: string): Result<null> => {
	const raw = readText(packageJsonPath);
	if (!raw.status) return raw;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.data);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { status: false, message: `Invalid JSON in ${packageJsonPath}: ${message}` };
	}

	if (!parsed || typeof parsed !== "object") {
		return { status: false, message: `Invalid structure in ${packageJsonPath}` };
	}

	const pkg = parsed as Record<string, unknown>;
	if (typeof pkg.version !== "string") {
		return { status: false, message: `Missing "version" string in ${packageJsonPath}` };
	}

	pkg.version = nextVersion;
	return writeText(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

const updateConfigTsVersion = (configPath: string, nextVersion: string): Result<null> => {
	const raw = readText(configPath);
	if (!raw.status) return raw;

	const pattern = /(version:\s*)['"](\d+\.\d+\.\d+)['"]/;
	if (!pattern.test(raw.data)) {
		return { status: false, message: `Could not find NEXTPRESS_CONFIG.version in ${configPath}` };
	}

	return writeText(configPath, raw.data.replace(pattern, `$1'${nextVersion}'`));
};

const updateStandaloneCliVersion = (cliScriptPath: string, nextVersion: string): Result<null> => {
	const raw = readText(cliScriptPath);
	if (!raw.status) return raw;

	const pattern = /(readonly CLI_VERSION="nextpress )(\d+\.\d+\.\d+)(")/;
	if (!pattern.test(raw.data)) {
		return {
			status: false,
			message: `Could not find CLI_VERSION="nextpress x.y.z" in ${cliScriptPath}`,
		};
	}

	return writeText(cliScriptPath, raw.data.replace(pattern, `$1${nextVersion}$3`));
};

const fail = (message: string): never => {
	console.error(message);
	process.exit(1);
};

const log = (message: string): void => {
	console.log(message);
};

const printUsage = (): void => {
	log(`Usage:
  pnpm version:bump                 Deploy rule (patch+1, or minor+1 when patch is 10)
  pnpm version:bump --patch         Force patch bump
  pnpm version:bump --minor         Force minor bump (reset patch to 0)
  pnpm version:bump --major         Force major bump (reset minor/patch to 0)
  pnpm version:bump --set 1.2.0     Set an explicit semver
  pnpm version:set 1.2.0            Alias for --set`);
};

const resolveNextVersion = (params: {
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

	const kindByFlag: Record<string, BumpKind> = {
		"--patch": "patch",
		"--minor": "minor",
		"--major": "major",
		"--deploy": "deploy",
	};

	if (args[0] === "--help" || args[0] === "-h") {
		printUsage();
		process.exit(0);
	}

	const kind = args[0] ? kindByFlag[args[0]] ?? "deploy" : "deploy";
	if (args[0] && !kindByFlag[args[0]] && args[0] !== "--set") {
		const direct = parseSemver(args[0]);
		if (direct) return formatSemver(direct);
		fail(`Unknown option: ${args[0]}`);
	}

	const next = bumpVersion({ current, kind });
	if (!next) fail(`Invalid current version in package.json: "${current}"`);
	return next;
};

const applyVersion = (params: {
	repoRoot: string;
	nextVersion: string;
	before: string;
}): void => {
	const packageJsonPath = path.join(params.repoRoot, "package.json");
	const configPath = path.join(params.repoRoot, "config.ts");
	const cliScriptPath = path.join(params.repoRoot, "scripts", "nextpress");

	const r1 = updatePackageJsonVersion(packageJsonPath, params.nextVersion);
	if (!r1.status) fail(r1.message);
	const r2 = updateConfigTsVersion(configPath, params.nextVersion);
	if (!r2.status) fail(r2.message);
	const r3 = updateStandaloneCliVersion(cliScriptPath, params.nextVersion);
	if (!r3.status) fail(r3.message);

	log(`Version bumped: ${params.before} -> ${params.nextVersion}`);
	log("- updated: package.json");
	log("- updated: config.ts");
	log("- updated: scripts/nextpress");
};

/** CLI entry — bumps or sets semver across package.json, config.ts, and scripts/nextpress. */
const main = (): void => {
	const repoRoot = path.resolve(import.meta.dirname, "..");
	const packageJsonPath = path.join(repoRoot, "package.json");
	const pkgRaw = readText(packageJsonPath);
	if (!pkgRaw.status) fail(pkgRaw.message);

	let parsed: unknown;
	try {
		parsed = JSON.parse(pkgRaw.data);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		fail(`Invalid JSON in ${packageJsonPath}: ${message}`);
	}

	const pkg = parsed as Record<string, unknown>;
	const currentVersion = typeof pkg.version === "string" ? pkg.version : "";
	if (!currentVersion) fail(`Missing "version" string in ${packageJsonPath}`);

	const nextVersion = resolveNextVersion({
		current: currentVersion,
		args: process.argv.slice(2),
	});

	applyVersion({ repoRoot, nextVersion, before: currentVersion });
};

main();

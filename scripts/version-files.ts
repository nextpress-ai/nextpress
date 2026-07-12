import fs from "node:fs";
import path from "node:path";

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

/** Reads workspace version from package.json. */
export const readWorkspaceVersion = (repoRoot: string): Result<string> => {
	const packageJsonPath = path.join(repoRoot, "package.json");
	const pkgRaw = readText(packageJsonPath);
	if (!pkgRaw.status) return pkgRaw;

	let parsed: unknown;
	try {
		parsed = JSON.parse(pkgRaw.data);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { status: false, message: `Invalid JSON in ${packageJsonPath}: ${message}` };
	}

	const pkg = parsed as Record<string, unknown>;
	const currentVersion = typeof pkg.version === "string" ? pkg.version : "";
	if (!currentVersion) {
		return { status: false, message: `Missing "version" string in ${packageJsonPath}` };
	}

	return { status: true, data: currentVersion };
};

/** Writes semver to package.json, config.ts, and scripts/nextpress. */
export const applyWorkspaceVersion = (params: {
	repoRoot: string;
	nextVersion: string;
}): Result<null> => {
	const packageJsonPath = path.join(params.repoRoot, "package.json");
	const configPath = path.join(params.repoRoot, "config.ts");
	const cliScriptPath = path.join(params.repoRoot, "scripts", "nextpress");

	const r1 = updatePackageJsonVersion(packageJsonPath, params.nextVersion);
	if (!r1.status) return r1;
	const r2 = updateConfigTsVersion(configPath, params.nextVersion);
	if (!r2.status) return r2;
	return updateStandaloneCliVersion(cliScriptPath, params.nextVersion);
};

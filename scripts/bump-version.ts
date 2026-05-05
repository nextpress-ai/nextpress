import fs from "node:fs";
import path from "node:path";

type Result<T> = { status: true; data: T } | { status: false; message: string };

function readText(filePath: string): Result<string> {
  try {
    return { status: true, data: fs.readFileSync(filePath, "utf8") };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: false, message: `Failed reading ${filePath}: ${message}` };
  }
}

function writeText(filePath: string, text: string): Result<null> {
  try {
    fs.writeFileSync(filePath, text, "utf8");
    return { status: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: false, message: `Failed writing ${filePath}: ${message}` };
  }
}

function parseSemver(raw: string): Result<{ major: number; minor: number; patch: number }> {
  const match = raw.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return { status: false, message: `Expected semver x.y.z, got: "${raw}"` };
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if ([major, minor, patch].some((n) => !Number.isFinite(n))) {
    return { status: false, message: `Invalid semver numbers: "${raw}"` };
  }
  return { status: true, data: { major, minor, patch } };
}

function formatSemver(v: { major: number; minor: number; patch: number }): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function bumpPatch(version: string): Result<{ before: string; after: string }> {
  const parsed = parseSemver(version);
  if (!parsed.status) return parsed;
  const before = version.trim();
  const after = formatSemver({
    major: parsed.data.major,
    minor: parsed.data.minor,
    patch: parsed.data.patch + 1,
  });
  return { status: true, data: { before, after } };
}

function updatePackageJsonVersion(packageJsonPath: string, nextVersion: string): Result<null> {
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
  const updated = `${JSON.stringify(pkg, null, 2)}\n`;
  return writeText(packageJsonPath, updated);
}

function updateConfigTsVersion(configPath: string, nextVersion: string): Result<null> {
  const raw = readText(configPath);
  if (!raw.status) return raw;

  const pattern = /(version:\s*)['"](\d+\.\d+\.\d+)['"]/;
  if (!pattern.test(raw.data)) {
    return { status: false, message: `Could not find NEXTPRESS_CONFIG.version in ${configPath}` };
  }

  const updated = raw.data.replace(pattern, `$1'${nextVersion}'`);
  return writeText(configPath, updated);
}

function updateStandaloneCliVersion(cliScriptPath: string, nextVersion: string): Result<null> {
  const raw = readText(cliScriptPath);
  if (!raw.status) return raw;

  const pattern = /(readonly CLI_VERSION="nextpress )(\d+\.\d+\.\d+)(")/;
  if (!pattern.test(raw.data)) {
    return {
      status: false,
      message: `Could not find CLI_VERSION="nextpress x.y.z" in ${cliScriptPath}`,
    };
  }

  const updated = raw.data.replace(pattern, `$1${nextVersion}$3`);
  return writeText(cliScriptPath, updated);
}

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}

function main(): void {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const packageJsonPath = path.join(repoRoot, "package.json");
  const configPath = path.join(repoRoot, "config.ts");
  const cliScriptPath = path.join(repoRoot, "scripts", "nextpress");

  const pkgRaw = readText(packageJsonPath);
  if (!pkgRaw.status) fail(pkgRaw.message);

  let current: unknown;
  try {
    current = JSON.parse(pkgRaw.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    fail(`Invalid JSON in ${packageJsonPath}: ${message}`);
  }

  const pkg = current as Record<string, unknown>;
  const currentVersion = typeof pkg.version === "string" ? pkg.version : "";
  if (!currentVersion) fail(`Missing "version" string in ${packageJsonPath}`);

  const bumped = bumpPatch(currentVersion);
  if (!bumped.status) fail(bumped.message);

  const nextVersion = bumped.data.after;

  const r1 = updatePackageJsonVersion(packageJsonPath, nextVersion);
  if (!r1.status) fail(r1.message);
  const r2 = updateConfigTsVersion(configPath, nextVersion);
  if (!r2.status) fail(r2.message);
  const r3 = updateStandaloneCliVersion(cliScriptPath, nextVersion);
  if (!r3.status) fail(r3.message);

  log(`Version bumped: ${bumped.data.before} -> ${nextVersion}`);
  log(`- updated: package.json`);
  log(`- updated: config.ts`);
  log(`- updated: scripts/nextpress`);
}

main();


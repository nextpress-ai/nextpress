import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RELEASE_MANIFEST } from "../shared/release/release-manifest";

type RunResult = { ok: true } | { ok: false; message: string };

const repoRoot = path.resolve(import.meta.dirname, "..");

const run = (command: string, args: string[]): RunResult => {
	const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit" });
	if (result.error) {
		const message = result.error instanceof Error ? result.error.message : String(result.error);
		return { ok: false, message };
	}
	if ((result.status ?? 1) !== 0) {
		return { ok: false, message: `${command} exited with code ${result.status ?? 1}` };
	}
	return { ok: true };
};

const runQuiet = (command: string, args: string[]): number =>
	spawnSync(command, args, { cwd: repoRoot, stdio: "ignore" }).status ?? 1;

const readVersion = (): string => {
	const raw = fs.readFileSync(path.join(repoRoot, "package.json"), "utf8");
	const parsed = JSON.parse(raw) as { version?: string };
	if (!parsed.version?.trim()) {
		throw new Error("package.json version is missing");
	}
	return parsed.version.trim();
};

const kindHeading: Record<string, string> = {
	update: "New",
	fix: "Fixes",
	improvement: "Improvements",
};

const buildReleaseNotes = (version: string): string => {
	const lines = [
		`## NextPress v${version}`,
		"",
		`Released ${new Date().toISOString().slice(0, 10)}.`,
		"",
	];

	for (const kind of ["update", "fix", "improvement"] as const) {
		const items = RELEASE_MANIFEST.highlights.filter((item) => item.kind === kind);
		if (items.length === 0) continue;
		lines.push(`### ${kindHeading[kind]}`, "");
		for (const item of items) {
			lines.push(`- **${item.title}**: ${item.description}`);
		}
		lines.push("");
	}

	lines.push(
		"### Docker",
		"",
		`- Image: \`husseinkizz/nextpress:beta-v${version}\``,
		`- Upgrade: \`nextpress upgrade --version beta-v${version}\``,
		"",
	);

	return lines.join("\n");
};

const hasStagedChanges = (): boolean => runQuiet("git", ["diff", "--cached", "--quiet"]) !== 0;

const tagExists = (tag: string): boolean => runQuiet("git", ["rev-parse", `${tag}^{tag}`]) === 0;

const releaseExists = (tag: string): boolean => runQuiet("gh", ["release", "view", tag]) === 0;

/**
 * Commits version bump files when changed, tags vX.Y.Z, and publishes a GitHub release.
 * Used by deploy.sh after a successful Docker push.
 */
const main = (): void => {
	const version = readVersion();
	const tag = `v${version}`;
	const notesPath = path.join(os.tmpdir(), `nextpress-release-notes-${version}.md`);
	const notes = buildReleaseNotes(version);
	fs.writeFileSync(notesPath, notes, "utf8");

	try {
		const filesToCommit = [
			"package.json",
			"config.ts",
			"scripts/nextpress",
			"nextpress.config.json",
		];

		for (const file of filesToCommit) {
			const fullPath = path.join(repoRoot, file);
			if (!fs.existsSync(fullPath)) continue;
			const add = run("git", ["add", file]);
			if (!add.ok) {
				console.error(add.message);
				process.exit(1);
			}
		}

		if (hasStagedChanges()) {
			const commit = run("git", ["commit", "-m", `chore: release ${tag}`]);
			if (!commit.ok) {
				console.error(commit.message);
				process.exit(1);
			}
		} else {
			console.log(`Version files unchanged for ${tag}; skipping commit`);
		}

		if (!tagExists(tag)) {
			const tagResult = run("git", ["tag", "-a", tag, "-m", `NextPress ${tag}`]);
			if (!tagResult.ok) {
				console.error(tagResult.message);
				process.exit(1);
			}
		} else {
			console.log(`Tag ${tag} already exists; skipping tag creation`);
		}

		if (!releaseExists(tag)) {
			const release = run("gh", [
				"release",
				"create",
				tag,
				"--title",
				`NextPress ${tag}`,
				"--notes-file",
				notesPath,
			]);
			if (!release.ok) {
				console.error(release.message);
				process.exit(1);
			}
		} else {
			console.log(`GitHub release ${tag} already exists; skipping release create`);
		}

		const pushHead = run("git", ["push", "origin", "HEAD"]);
		if (!pushHead.ok) {
			console.error(pushHead.message);
			process.exit(1);
		}

		const pushTag = run("git", ["push", "origin", tag]);
		if (!pushTag.ok) {
			console.error(pushTag.message);
			process.exit(1);
		}

		console.log(`Published GitHub release ${tag}`);
	} finally {
		fs.rmSync(notesPath, { force: true });
	}
};

main();

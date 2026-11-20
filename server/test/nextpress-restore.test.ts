import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * Drives the real bash CLI (scripts/nextpress) by sourcing it and replacing only Docker: `compose`
 * records each call and answers the way the containers would. The command's own checks, the backup
 * step, the order of operations and the hand-off to psql are all real.
 */
const SCRIPT = fileURLToPath(new URL("../../scripts/nextpress", import.meta.url));

const DOCKER_STUB = `
assert_install_dir_exists() { :; }
assert_docker_available() { :; }
ensure_postgres_running() { :; }
run_schema_migrations() { printf 'migrations\\n' >> "$INSTALL_DIR/calls.log"; }
wait_for_app_health() { printf 'health\\n' >> "$INSTALL_DIR/calls.log"; }
compose() {
	printf '%s\\n' "$*" >> "$INSTALL_DIR/calls.log"
	case "$*" in
		"exec -T postgres pg_dump -U postgres nextpress") printf -- '-- dump\\n' ;;
		"stop app") : ;;
		"up -d") : ;;
		"exec -T postgres psql -U postgres -d nextpress -c "*"DROP SCHEMA"*) : ;;
		"exec -T postgres psql -U postgres -d nextpress -v ON_ERROR_STOP=1")
			cat >> "$INSTALL_DIR/restored.log"
			return "\${FAKE_PSQL_EXIT:-0}"
			;;
		*) : ;;
	esac
}
`;

type BashResult = { code: number | null; stdout: string; stderr: string };

let workDir: string;
let installDir: string;
let backupFile: string;

const runBash = ({ body, env = {} }: { body: string; env?: Record<string, string> }): BashResult => {
	const driver = path.join(workDir, "driver.sh");
	fs.writeFileSync(
		driver,
		`#!/usr/bin/env bash\nset -euo pipefail\nsource ${JSON.stringify(SCRIPT)}\nINSTALL_DIR=${JSON.stringify(installDir)}\n${DOCKER_STUB}\n${body}\n`,
	);
	// setsid: no controlling terminal, like a cron job or CI step, so a prompt can never wait on the person running tests.
	const result = spawnSync("setsid", ["--wait", "bash", driver], { encoding: "utf8", timeout: 30_000, env: { ...process.env, ...env } });
	return { code: result.status, stdout: result.stdout, stderr: result.stderr };
};

const readLog = (name: string): string | null => {
	const file = path.join(installDir, name);
	return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
};

const DUMP = "-- PostgreSQL database dump\nCREATE TABLE sites (id uuid);\n";

describe("nextpress restore", () => {
	beforeEach(() => {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), "nextpress-restore-"));
		installDir = path.join(workDir, "install");
		fs.mkdirSync(installDir);
		fs.writeFileSync(path.join(installDir, "docker-compose.prod.yml"), "services: {}\n");
		fs.writeFileSync(path.join(installDir, ".env"), "POSTGRES_PASSWORD=test\n");
		backupFile = path.join(workDir, "nextpress-db-20260101-120000.sql");
		fs.writeFileSync(backupFile, DUMP);
	});

	afterEach(() => {
		fs.rmSync(workDir, { recursive: true, force: true });
	});

	it("backs up, clears the database, restores the dump, migrates and restarts, in that order", () => {
		const result = runBash({ body: `run_restore ${JSON.stringify(backupFile)} --yes` });

		expect(result.code).toBe(0);
		expect(readLog("restored.log")).toBe(DUMP);
		expect(readLog("calls.log")).toBe(
			[
				"exec -T postgres pg_dump -U postgres nextpress",
				"stop app",
				'exec -T postgres psql -U postgres -d nextpress -c DROP SCHEMA public CASCADE; CREATE SCHEMA public;',
				"exec -T postgres psql -U postgres -d nextpress -v ON_ERROR_STOP=1",
				"migrations",
				"up -d",
				"health",
				"",
			].join("\n"),
		);
		expect(result.stdout).toContain("Restore complete");
	});

	it("writes the pre-restore backup into backups/", () => {
		const result = runBash({ body: `run_restore ${JSON.stringify(backupFile)} --yes` });

		expect(result.code).toBe(0);
		const backups = fs.readdirSync(path.join(installDir, "backups"));
		expect(backups).toHaveLength(1);
		expect(backups[0]).toMatch(/^nextpress-db-\d{14}\.sql$/);
	});

	it("stops when the restore fails and leaves the app stopped with the backup kept", () => {
		const result = runBash({ body: `run_restore ${JSON.stringify(backupFile)} --yes`, env: { FAKE_PSQL_EXIT: "1" } });

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Restore failed partway");
		expect(fs.readdirSync(path.join(installDir, "backups"))).toHaveLength(1);
		expect(readLog("calls.log")).not.toContain("up -d");
	});

	it("refuses an export file and points at import", () => {
		const exportFile = path.join(workDir, "nextpress-export.tar.gz");
		fs.writeFileSync(exportFile, "bytes");
		const result = runBash({ body: `run_restore ${JSON.stringify(exportFile)} --yes` });

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("nextpress import");
		expect(readLog("calls.log")).toBeNull();
	});

	it("refuses a backup with no terminal and no --yes, and changes nothing", () => {
		const result = runBash({ body: `run_restore ${JSON.stringify(backupFile)}` });

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("without an interactive terminal");
		expect(readLog("calls.log")).toBeNull();
	});

	it("stops before touching the database when the file is missing or empty", () => {
		const missing = runBash({ body: `run_restore ${JSON.stringify(path.join(workDir, "nope.sql"))} --yes` });
		expect(missing.code).toBe(1);
		expect(missing.stderr).toContain("Backup file not found");

		const empty = path.join(workDir, "empty.sql");
		fs.writeFileSync(empty, "");
		const emptyResult = runBash({ body: `run_restore ${JSON.stringify(empty)} --yes` });
		expect(emptyResult.code).toBe(1);
		expect(emptyResult.stderr).toContain("Backup file is empty");

		expect(readLog("calls.log")).toBeNull();
	});

	it("asks for the file when it is missing", () => {
		const result = runBash({ body: "run_restore --yes" });
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Missing backup file");
	});
});

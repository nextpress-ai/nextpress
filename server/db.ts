import "dotenv/config";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const PGLITE_DATA_DIR = "./data/pglite";
const PGLITE_LOCK_FILE = "./data/pglite.lock";

type AppDb = ReturnType<typeof drizzlePg> | Awaited<ReturnType<typeof createDevDatabase>>["db"];

const isProcessAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// EPERM: the process exists but belongs to someone else.
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
};

/**
 * PGlite has no lock of its own. Two processes writing the same folder
 * (dev server + seed script, or a second dev server) break its save point
 * and the database will not open again. Refuse to start instead.
 */
function claimDevDataDir(): void {
	if (existsSync(PGLITE_LOCK_FILE)) {
		const ownerPid = Number(readFileSync(PGLITE_LOCK_FILE, "utf8").trim());
		if (ownerPid && ownerPid !== process.pid && isProcessAlive(ownerPid)) {
			throw new Error(
				`${PGLITE_DATA_DIR} is already open in another process (pid ${ownerPid}). Stop it first, then try again.`,
			);
		}
	}
	writeFileSync(PGLITE_LOCK_FILE, String(process.pid));
}

let devClient: { close: () => Promise<void> } | null = null;

/**
 * Closes the dev PGlite folder and gives it back to the next process.
 * Scripts must call this before exiting: a process that ends with PGlite
 * still open can leave the folder unable to open again.
 * Production Postgres and in-memory test databases need nothing here.
 */
async function closeDatabase(): Promise<void> {
	const client = devClient;
	if (!client) return;
	devClient = null;
	await client.close().catch((error: Error) => {
		console.error(`[DB] PGlite did not close cleanly (data: ${PGLITE_DATA_DIR}):`, error);
	});
	rmSync(PGLITE_LOCK_FILE, { force: true });
}

/**
 * Ctrl+C, a closed terminal or a stop signal closes PGlite before the process ends.
 * Repeats are ignored while closing: Ctrl+C reaches this process twice under tsx
 * (terminal + tsx passing it on), and the default action would kill it mid-close.
 */
function closeDatabaseOnSignal(): void {
	let isShuttingDown = false;
	(["SIGINT", "SIGTERM", "SIGHUP"] as const).forEach((signal) =>
		process.on(signal, () => {
			if (isShuttingDown) return;
			isShuttingDown = true;
			void closeDatabase().then(() => process.exit(0));
		}),
	);
}

/**
 * Production uses Postgres. Development uses PGlite, loaded only in that branch
 * so the prod image does not need the package. Tests get an in-memory PGlite so
 * a test run never writes the dev data folder.
 */
async function createDevDatabase(): Promise<{
	db: ReturnType<typeof import("drizzle-orm/pglite").drizzle>;
	pool: null;
}> {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
	if (isTest) {
		return { db: drizzlePglite(new PGlite(), { schema }), pool: null };
	}
	claimDevDataDir();
	const client = new PGlite(PGLITE_DATA_DIR);
	devClient = client;
	closeDatabaseOnSignal();
	const db = drizzlePglite(client, { schema });
	console.error(`[DB] Using PGlite for development (data: ${PGLITE_DATA_DIR})`);
	return { db, pool: null };
}

async function createDatabase(): Promise<{ db: AppDb; pool: Pool | null }> {
	if (isProduction) {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				"DATABASE_URL must be set in production. Did you forget to provision a database?",
			);
		}
		const pool = new Pool({ connectionString: process.env.DATABASE_URL });
		const db = drizzlePg(process.env.DATABASE_URL, { schema });
		console.error("[DB] Connected to PostgreSQL (production)");
		return { db, pool };
	}
	return createDevDatabase();
}

const { db, pool } = await createDatabase();

/**
 * Applies migrations to PGlite in development mode.
 * No-op in production (schema applied by `node dist/migrate.js` / drizzle-kit).
 */
async function initDevDatabase() {
	if (isProduction) return;

	const { migrate } = await import("drizzle-orm/pglite/migrator");
	await migrate(db as Awaited<ReturnType<typeof createDevDatabase>>["db"], {
		migrationsFolder: "./migrations",
	});
	console.log("[DB] PGlite migrations applied");
}

export { db, pool, initDevDatabase, closeDatabase };

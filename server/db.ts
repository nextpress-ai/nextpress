import "dotenv/config";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const isProduction = process.env.NODE_ENV === "production";

type AppDb = ReturnType<typeof drizzlePg> | Awaited<ReturnType<typeof createDevDatabase>>["db"];

/**
 * Production uses Postgres. Development uses PGlite, loaded only in that branch
 * so the prod image does not need the package.
 */
async function createDevDatabase(): Promise<{
	db: ReturnType<typeof import("drizzle-orm/pglite").drizzle>;
	pool: null;
}> {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
	const pgliteDataDir = "./data/pglite";
	const client = new PGlite(pgliteDataDir);
	const db = drizzlePglite(client, { schema });
	console.error(`[DB] Using PGlite for development (data: ${pgliteDataDir})`);
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

export { db, pool, initDevDatabase };

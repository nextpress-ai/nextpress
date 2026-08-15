import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Apply SQL migrations from ./migrations (same journal as drizzle-kit migrate).
 * Used by the NextPress CLI inside the app image so upgrades do not need pnpm.
 */
async function runMigrations(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL must be set to run migrations.");
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);
	try {
		await migrate(db, { migrationsFolder: "./migrations" });
		console.log("[migrate] Schema migrations applied");
	} finally {
		await pool.end();
	}
}

runMigrations().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error("[migrate] Failed:", message);
	process.exit(1);
});

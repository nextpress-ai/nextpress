import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

type Journal = {
	entries: Array<{ idx: number; tag: string }>;
};

/**
 * Drizzle only applies files listed in the journal. Duplicate 0006_ prefixes
 * previously dropped posts.version and api_keys.site_id from fresh installs.
 */
describe("migration journal", () => {
	const journal = JSON.parse(
		readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"),
	) as Journal;
	const tags = new Set(journal.entries.map((entry) => entry.tag));

	it("includes posts.version and api_keys.site_id SQL", () => {
		expect(tags.has("0006_posts_version")).toBe(true);
		expect(tags.has("0006_api_keys_site_required")).toBe(true);
		expect(tags.has("0007_posts_menu_order")).toBe(true);
	});

	it("points every journal tag at an existing SQL file", () => {
		const files = new Set(readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")));
		for (const tag of tags) {
			expect(files.has(`${tag}.sql`)).toBe(true);
		}
	});

	it("uses unique idx values in apply order", () => {
		const idxs = journal.entries.map((entry) => entry.idx);
		expect(idxs).toEqual([...idxs].sort((a, b) => a - b));
		expect(new Set(idxs).size).toBe(idxs.length);
	});

	it("splits multi-statement SQL so PGlite can apply each command", () => {
		for (const tag of tags) {
			const sql = readFileSync(join(migrationsDir, `${tag}.sql`), "utf8");
			const statements = sql
				.split(/-->\s*statement-breakpoint/)
				.map((part) => part.replace(/--[^\n]*/g, "").trim())
				.filter(Boolean);
			for (const statement of statements) {
				const commands = statement.split(";").filter((part) => part.trim());
				expect(
					commands.length,
					`${tag}.sql has multiple commands without a breakpoint`,
				).toBe(1);
			}
		}
	});
});

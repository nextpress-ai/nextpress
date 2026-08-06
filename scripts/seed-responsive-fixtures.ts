import "dotenv/config";
import { initDevDatabase } from "../server/db.js";
import { models } from "../server/storage.js";
import { validateContentForSave } from "@shared/validate-content-save";
import { responsiveGoldenFixtures } from "@shared/test/fixtures/responsive/fixtures";
import type { BlockConfig } from "@shared/schema-types";

type FixturePageSeed = {
	key: keyof typeof responsiveGoldenFixtures;
	title: string;
	slug: string;
};

const FIXTURE_PAGES: FixturePageSeed[] = [
	{
		key: "layout",
		title: "Responsive Layout Stress",
		slug: "responsive-layout-stress",
	},
	{
		key: "content",
		title: "Responsive Content Stress",
		slug: "responsive-content-stress",
	},
	{
		key: "typography",
		title: "Responsive Typography Stress",
		slug: "responsive-typography-stress",
	},
];

type SeedResult = {
	slug: string;
	id: string;
	action: "created" | "updated";
	spaUrl: string;
	ssrUrl: string;
	previewUrl: string;
};

type SeedOptions = {
	baseUrl?: string;
	viaApi?: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:5000";
const DEFAULT_SEED_EMAIL = "responsive-fixtures@example.com";
const DEFAULT_SEED_PASSWORD = "TestPass1";

/** Resolves site and author for idempotent fixture seeding via PGlite. */
async function resolveSeedContext(): Promise<{ siteId: string; authorId: string }> {
	const site = await models.sites.findDefaultSite();
	if (!site?.id) {
		throw new Error("No default site found. Run setup or seed defaults first.");
	}

	const users = await models.users.findMany();
	if (users.length === 0) {
		throw new Error("No users found. Register an account at /admin/register first.");
	}

	return { siteId: String(site.id), authorId: users[0].id };
}

function buildUrls({ baseUrl, slug, id }: { baseUrl: string; slug: string; id: string }): Omit<
	SeedResult,
	"slug" | "id" | "action"
> {
	return {
		spaUrl: `${baseUrl}/page/${slug}`,
		ssrUrl: `${baseUrl}/pages/${id}`,
		previewUrl: `${baseUrl}/preview/page/${id}`,
	};
}

function validatedBlocks(key: FixturePageSeed["key"]): BlockConfig[] {
	const blocks = responsiveGoldenFixtures[key] as BlockConfig[];
	const validation = validateContentForSave({ blocks, contentType: "page" });
	if (!validation.ok) {
		throw new Error(`${key}: ${validation.error.code} — ${validation.error.message}`);
	}
	return validation.blocks;
}

/** Creates or updates one published fixture page by slug (direct PGlite). */
async function upsertFixturePageDb({
	seed,
	siteId,
	authorId,
	baseUrl,
}: {
	seed: FixturePageSeed;
	siteId: string;
	authorId: string;
	baseUrl: string;
}): Promise<SeedResult> {
	const blocks = validatedBlocks(seed.key);
	const existing = await models.pages.findBySiteAndSlug(siteId, seed.slug);
	const pagePayload = {
		title: seed.title,
		slug: seed.slug,
		siteId,
		authorId,
		status: "publish" as const,
		blocks,
	};

	const page = existing?.id
		? await models.pages.update(existing.id, pagePayload)
		: await models.pages.create(pagePayload);

	if (!page?.id) {
		throw new Error(`${seed.slug}: failed to save page`);
	}

	return {
		slug: seed.slug,
		id: page.id,
		action: existing?.id ? "updated" : "created",
		...buildUrls({ baseUrl, slug: seed.slug, id: page.id }),
	};
}

type ApiPage = { id: string; slug: string; version?: number };

async function ensureApiSession({
	baseUrl,
	cookieJar,
}: {
	baseUrl: string;
	cookieJar: Map<string, string>;
}): Promise<void> {
	const email = process.env.SEED_EMAIL ?? DEFAULT_SEED_EMAIL;
	const password = process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD;
	const origin = baseUrl;

	const signIn = async (): Promise<Response> =>
		fetch(`${baseUrl}/api/auth/sign-in/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Origin: origin },
			body: JSON.stringify({ email, password }),
		});

	let response = await signIn();
	if (response.status === 401 || response.status === 404) {
		const username = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") || "fixtureseed";
		await fetch(`${baseUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Origin: origin },
			body: JSON.stringify({
				email,
				password,
				name: "Responsive Fixtures",
				username,
				firstName: "Responsive",
				lastName: "Fixtures",
			}),
		});
		response = await signIn();
	}

	const setCookie = response.headers.getSetCookie?.() ?? [];
	for (const raw of setCookie) {
		const [pair] = raw.split(";");
		const [name, value] = pair.split("=");
		if (name && value) cookieJar.set(name.trim(), value.trim());
	}

	if (!response.ok) {
		throw new Error(`API sign-in failed (${response.status}). Set SEED_EMAIL / SEED_PASSWORD or register first.`);
	}
}

function cookieHeader(cookieJar: Map<string, string>): string {
	return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function listApiPages({
	baseUrl,
	cookieJar,
}: {
	baseUrl: string;
	cookieJar: Map<string, string>;
}): Promise<ApiPage[]> {
	const response = await fetch(`${baseUrl}/api/pages?limit=100&status=any`, {
		headers: { Cookie: cookieHeader(cookieJar), Origin: baseUrl },
	});
	if (!response.ok) {
		throw new Error(`Failed to list pages (${response.status})`);
	}
	const body = (await response.json()) as { pages?: ApiPage[] };
	return body.pages ?? [];
}

async function upsertFixturePageApi({
	seed,
	baseUrl,
	cookieJar,
	existingBySlug,
}: {
	seed: FixturePageSeed;
	baseUrl: string;
	cookieJar: Map<string, string>;
	existingBySlug: Map<string, ApiPage>;
}): Promise<SeedResult> {
	const blocks = validatedBlocks(seed.key);
	const existing = existingBySlug.get(seed.slug);
	const headers = {
		"Content-Type": "application/json",
		Cookie: cookieHeader(cookieJar),
		Origin: baseUrl,
	};

	if (existing?.id) {
		const response = await fetch(`${baseUrl}/api/pages/${existing.id}`, {
			method: "PUT",
			headers,
			body: JSON.stringify({
				title: seed.title,
				slug: seed.slug,
				status: "publish",
				blocks,
				expectedVersion: existing.version ?? 0,
			}),
		});
		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Update ${seed.slug} failed (${response.status}): ${err}`);
		}
		const page = (await response.json()) as ApiPage;
		return {
			slug: seed.slug,
			id: page.id,
			action: "updated",
			...buildUrls({ baseUrl, slug: seed.slug, id: page.id }),
		};
	}

	const response = await fetch(`${baseUrl}/api/pages`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			title: seed.title,
			slug: seed.slug,
			status: "publish",
			blocks,
		}),
	});
	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Create ${seed.slug} failed (${response.status}): ${err}`);
	}
	const page = (await response.json()) as ApiPage;
	return {
		slug: seed.slug,
		id: page.id,
		action: "created",
		...buildUrls({ baseUrl, slug: seed.slug, id: page.id }),
	};
}

async function seedResponsiveFixturesViaApi(baseUrl: string): Promise<SeedResult[]> {
	const health = await fetch(`${baseUrl}/api/health`).catch(() => null);
	if (!health?.ok) {
		throw new Error(`Server not reachable at ${baseUrl}. Start pnpm dev, then run with --via-api.`);
	}

	const cookieJar = new Map<string, string>();
	await ensureApiSession({ baseUrl, cookieJar });
	const existingPages = await listApiPages({ baseUrl, cookieJar });
	const existingBySlug = new Map(existingPages.map((page) => [page.slug, page]));

	const results: SeedResult[] = [];
	for (const seed of FIXTURE_PAGES) {
		results.push(await upsertFixturePageApi({ seed, baseUrl, cookieJar, existingBySlug }));
	}
	return results;
}

/** Idempotent Gate 3 fixture pages for browser responsive matrix. */
export async function seedResponsiveFixtures({
	baseUrl = DEFAULT_BASE_URL,
	viaApi = false,
}: SeedOptions = {}): Promise<SeedResult[]> {
	if (viaApi) {
		return seedResponsiveFixturesViaApi(baseUrl);
	}

	try {
		await initDevDatabase();
	} catch (error) {
		throw new Error(
			`PGlite init failed (dev server may hold the DB lock). Stop pnpm dev and retry, or use: pnpm seed:responsive-fixtures -- --via-api\nOriginal: ${String(error)}`,
		);
	}

	const { siteId, authorId } = await resolveSeedContext();
	const results: SeedResult[] = [];
	for (const seed of FIXTURE_PAGES) {
		results.push(await upsertFixturePageDb({ seed, siteId, authorId, baseUrl }));
	}
	return results;
}

function printResults(results: SeedResult[]): void {
	console.log("[seed:responsive-fixtures] Done.\n");
	for (const row of results) {
		console.log(`  ${row.action.toUpperCase()} ${row.slug} (${row.id})`);
		console.log(`    SPA:     ${row.spaUrl}`);
		console.log(`    SSR:     ${row.ssrUrl}`);
		console.log(`    Preview: ${row.previewUrl}`);
		console.log("");
	}
	console.log("Browser matrix viewports: 390, 768, 1280 px");
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const viaApi = args.includes("--via-api");
	const baseUrl = process.env.SEED_BASE_URL ?? DEFAULT_BASE_URL;
	const results = await seedResponsiveFixtures({ baseUrl, viaApi });
	printResults(results);
}

main().catch((error: unknown) => {
	console.error("[seed:responsive-fixtures] Failed:", error);
	process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Seeds practical demo pages for normal editor workflows.
 * Usage: pnpm seed:demo-pages [--via-api]
 */
import "dotenv/config";
import { validateContentForSave } from "@shared/validate-content-save";
import {
	demoPageDefinitions,
	type DemoPageDefinition,
} from "@shared/test/fixtures/demo-pages/index";
import type { BlockConfig } from "@shared/schema-types";

type SeedResult = {
	slug: string;
	id: string;
	action: "created" | "updated";
	spaUrl: string;
	ssrUrl: string;
	previewUrl: string;
	editorUrl: string;
};

type SeedOptions = {
	baseUrl?: string;
	viaApi?: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:5000";
const DEFAULT_SEED_EMAIL = "responsive-fixtures@example.com";
const DEFAULT_SEED_PASSWORD = "TestPass1";

function validatedBlocks(blocks: BlockConfig[]): BlockConfig[] {
	const validation = validateContentForSave({ blocks, contentType: "page" });
	if (!validation.ok) {
		throw new Error(`${validation.error.code} — ${validation.error.message}`);
	}
	return validation.blocks;
}

function buildUrls({
	baseUrl,
	slug,
	id,
}: {
	baseUrl: string;
	slug: string;
	id: string;
}): Omit<SeedResult, "slug" | "id" | "action"> {
	return {
		spaUrl: `${baseUrl}/page/${slug}`,
		ssrUrl: `${baseUrl}/pages/${id}`,
		previewUrl: `${baseUrl}/preview/page/${id}?live=1`,
		editorUrl: `${baseUrl}/admin/page-builder/page/${id}`,
	};
}

async function resolveSeedContext(): Promise<{ siteId: string; authorId: string }> {
	const { models } = await import("../server/storage.js");
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

async function upsertDemoPageDb({
	def,
	siteId,
	authorId,
	baseUrl,
}: {
	def: DemoPageDefinition;
	siteId: string;
	authorId: string;
	baseUrl: string;
}): Promise<SeedResult> {
	const { models } = await import("../server/storage.js");
	const blocks = validatedBlocks(def.blocks);
	const existing = await models.pages.findBySiteAndSlug(siteId, def.slug);
	const pagePayload = {
		title: def.title,
		slug: def.slug,
		siteId,
		authorId,
		status: "publish" as const,
		blocks,
		other: {
			seo: {
				metaDescription: def.description,
			},
		},
	};

	const page = existing?.id
		? await models.pages.update(existing.id, pagePayload)
		: await models.pages.create(pagePayload);

	if (!page?.id) {
		throw new Error(`${def.slug}: failed to save page`);
	}

	return {
		slug: def.slug,
		id: page.id,
		action: existing?.id ? "updated" : "created",
		...buildUrls({ baseUrl, slug: def.slug, id: page.id }),
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
		const username = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") || "demoseed";
		await fetch(`${baseUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Origin: origin },
			body: JSON.stringify({
				email,
				password,
				name: "Demo Pages",
				username,
				firstName: "Demo",
				lastName: "Pages",
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
		throw new Error(`API sign-in failed (${response.status}). Set SEED_EMAIL / SEED_PASSWORD.`);
	}
}

function cookieHeader(cookieJar: Map<string, string>): string {
	return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function resolveApiSiteId({
	baseUrl,
	cookieJar,
}: {
	baseUrl: string;
	cookieJar: Map<string, string>;
}): Promise<string> {
	const response = await fetch(`${baseUrl}/api/sites`, {
		headers: { Cookie: cookieHeader(cookieJar), Origin: baseUrl },
	});
	if (!response.ok) {
		throw new Error(`Failed to list sites (${response.status})`);
	}
	const body = (await response.json()) as { sites?: Array<{ id: string }> } | Array<{ id: string }>;
	const sites = Array.isArray(body) ? body : (body.sites ?? []);
	const siteId = process.env.DEMO_SITE_ID ?? sites[0]?.id;
	if (!siteId) throw new Error("No site found to seed into.");
	return siteId;
}

async function listApiPages({
	baseUrl,
	cookieJar,
	siteId,
}: {
	baseUrl: string;
	cookieJar: Map<string, string>;
	siteId: string;
}): Promise<ApiPage[]> {
	const response = await fetch(
		`${baseUrl}/api/pages?limit=100&status=any&siteId=${encodeURIComponent(siteId)}`,
		{ headers: { Cookie: cookieHeader(cookieJar), Origin: baseUrl } },
	);
	if (!response.ok) {
		throw new Error(`Failed to list pages (${response.status})`);
	}
	const body = (await response.json()) as { pages?: ApiPage[] };
	return body.pages ?? [];
}

async function upsertDemoPageApi({
	def,
	baseUrl,
	cookieJar,
	existingBySlug,
	siteId,
}: {
	def: DemoPageDefinition;
	baseUrl: string;
	cookieJar: Map<string, string>;
	existingBySlug: Map<string, ApiPage>;
	siteId: string;
}): Promise<SeedResult> {
	const blocks = validatedBlocks(def.blocks);
	const existing = existingBySlug.get(def.slug);
	const headers = {
		"Content-Type": "application/json",
		Cookie: cookieHeader(cookieJar),
		Origin: baseUrl,
	};

	const payload = {
		title: def.title,
		slug: def.slug,
		siteId,
		status: "publish",
		blocks,
		other: { seo: { metaDescription: def.description } },
	};

	if (existing?.id) {
		const response = await fetch(`${baseUrl}/api/pages/${existing.id}`, {
			method: "PUT",
			headers,
			body: JSON.stringify({ ...payload, expectedVersion: existing.version ?? 0 }),
		});
		if (!response.ok) {
			throw new Error(`Update ${def.slug} failed (${response.status}): ${await response.text()}`);
		}
		const page = (await response.json()) as ApiPage;
		return {
			slug: def.slug,
			id: page.id,
			action: "updated",
			...buildUrls({ baseUrl, slug: def.slug, id: page.id }),
		};
	}

	const response = await fetch(`${baseUrl}/api/pages`, {
		method: "POST",
		headers,
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		throw new Error(`Create ${def.slug} failed (${response.status}): ${await response.text()}`);
	}
	const page = (await response.json()) as ApiPage;
	return {
		slug: def.slug,
		id: page.id,
		action: "created",
		...buildUrls({ baseUrl, slug: def.slug, id: page.id }),
	};
}

/** Idempotent demo workflow pages for manual QA and editor practice. */
export async function seedDemoPages({
	baseUrl = DEFAULT_BASE_URL,
	viaApi = false,
}: SeedOptions = {}): Promise<SeedResult[]> {
	if (viaApi) {
		const health = await fetch(`${baseUrl}/api/health`).catch(() => null);
		if (!health?.ok) {
			throw new Error(`Server not reachable at ${baseUrl}. Start pnpm dev, then use --via-api.`);
		}
		const cookieJar = new Map<string, string>();
		await ensureApiSession({ baseUrl, cookieJar });
		const siteId = await resolveApiSiteId({ baseUrl, cookieJar });
		const existingBySlug = new Map(
			(await listApiPages({ baseUrl, cookieJar, siteId })).map((page) => [page.slug, page]),
		);
		const results: SeedResult[] = [];
		for (const def of demoPageDefinitions) {
			results.push(await upsertDemoPageApi({ def, baseUrl, cookieJar, existingBySlug, siteId }));
		}
		return results;
	}

	try {
		const { initDevDatabase } = await import("../server/db.js");
		await initDevDatabase();
	} catch (error) {
		throw new Error(
			`PGlite init failed. Stop pnpm dev and retry, or use --via-api.\nOriginal: ${String(error)}`,
		);
	}

	const { siteId, authorId } = await resolveSeedContext();
	const results: SeedResult[] = [];
	for (const def of demoPageDefinitions) {
		results.push(await upsertDemoPageDb({ def, siteId, authorId, baseUrl }));
	}
	return results;
}

function printResults(results: SeedResult[]): void {
	console.log("[seed:demo-pages] Done.\n");
	for (const def of demoPageDefinitions) {
		const row = results.find((r) => r.slug === def.slug);
		if (!row) continue;
		console.log(`  ${row.action.toUpperCase()} ${def.title}`);
		console.log(`    Inspired by: ${def.inspiredBy}`);
		console.log(`    Slug:        ${row.slug}`);
		console.log(`    Editor:      ${row.editorUrl}`);
		console.log(`    Published:   ${row.spaUrl}`);
		console.log(`    Preview:     ${row.previewUrl}`);
		console.log("");
	}
	console.log("Try: open Editor links, toggle mobile/tablet, use live preview (eye icon).");
}

async function main(): Promise<void> {
	const viaApi = process.argv.includes("--via-api");
	const baseUrl = process.env.SEED_BASE_URL ?? DEFAULT_BASE_URL;
	const results = await seedDemoPages({ baseUrl, viaApi });
	printResults(results);
}

main().catch((error: unknown) => {
	console.error("[seed:demo-pages] Failed:", error);
	process.exit(1);
});

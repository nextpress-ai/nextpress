/**
 * Loads the public docs folder (`docs/public`: Markdown files with front matter, one folder per
 * group) into a NextPress site as a docs, then optionally writes a page file of the whole docs.
 *
 * Run from the repo root:
 *   pnpm exec tsx packages/sdk/scripts/import-public-docs/index.ts --dry-run
 *   pnpm exec tsx packages/sdk/scripts/import-public-docs/index.ts --base http://localhost:5055 --key-file ./key.txt --publish [--export out.json]
 *
 * It never overwrites: if a page at the docs address already exists the run stops before writing.
 * `--dry-run` converts every file and prints what would be made and anything left out.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { replaceDocsPageContent } from "../../../../shared/docs/docs-page-frame.js";
import type { BlockConfig } from "../../../../shared/schema-types.js";
import { markdownToBlocks } from "./markdown-to-blocks.js";
import { readDocsFolder, type DocsFolderItem } from "./read-docs-folder.js";

type Args = { folder: string; base: string; keyFile: string; slug: string; name: string; publish: boolean; dryRun: boolean; exportTo: string };

const readArgs = (argv: string[]): Args => {
	const value = (flag: string, fallback: string): string => {
		const at = argv.indexOf(flag);
		return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
	};
	return {
		folder: resolve(value("--folder", "docs/public")),
		base: value("--base", ""),
		keyFile: value("--key-file", ""),
		slug: value("--slug", "docs"),
		name: value("--name", "NextPress Docs"),
		publish: argv.includes("--publish"),
		dryRun: argv.includes("--dry-run"),
		exportTo: value("--export", ""),
	};
};

type Page = { id: string; version: number; blocks: BlockConfig[]; other?: { seo?: Record<string, string> } & Record<string, unknown>; title: string };

const createApi = ({ base, key }: { base: string; key: string }) => {
	const call = async <T>({ method, path, body }: { method: string; path: string; body?: unknown }): Promise<T> => {
		const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: body === undefined ? undefined : JSON.stringify(body) });
		const text = await response.text();
		if (!response.ok) throw new Error(`${method} ${path} answered ${response.status}: ${text.slice(0, 300)}`);
		return JSON.parse(text) as T;
	};
	return { call };
};

const convertAll = (items: DocsFolderItem[]): Map<DocsFolderItem, BlockConfig[]> => {
	const converted = new Map<DocsFolderItem, BlockConfig[]>();
	for (const item of items) {
		if (item.kind === "group") continue;
		const { blocks, warnings } = markdownToBlocks({ markdown: item.body, newId: randomUUID });
		for (const warning of warnings) console.warn(`${item.group}/${item.slug}: ${warning}`);
		converted.set(item, blocks);
	}
	return converted;
};

async function run(): Promise<void> {
	const args = readArgs(process.argv.slice(2));
	const folder = readDocsFolder(args.folder);
	const converted = convertAll(folder.items);
	const homeBlocks = markdownToBlocks({ markdown: folder.home.body, newId: randomUUID });
	for (const warning of homeBlocks.warnings) console.warn(`index: ${warning}`);
	const counts = [...converted.values()].reduce((sum, blocks) => sum + blocks.length, 0);
	console.log(`Read ${folder.items.filter((i) => i.kind === "page").length} pages in ${folder.items.filter((i) => i.kind === "group").length} groups; ${counts + homeBlocks.blocks.length} blocks.`);
	if (args.dryRun) return;
	if (!args.base || !args.keyFile) throw new Error("Give --base (the site address) and --key-file (a file holding an API key), or use --dry-run.");

	const api = createApi({ base: args.base.replace(/\/$/, ""), key: readFileSync(args.keyFile, "utf8").trim() });
	const sites = await api.call<{ sites: { id: string }[] }>({ method: "GET", path: "/api/sites" });
	const siteId = sites.sites[0]?.id;
	if (!siteId) throw new Error("This key sees no site.");

	const created = await api.call<{ homeId: string }>({ method: "POST", path: "/api/docs", body: { siteId, name: folder.home.title || args.name, slug: args.slug, search: true } });
	const homeId = created.homeId;
	const groupIds = new Map<string, string>();
	const pageIds = new Map<DocsFolderItem, string>();
	const ordered = [...folder.items].sort((a, b) => a.order - b.order);

	for (const group of ordered.filter((item) => item.kind === "group")) {
		const { item } = await api.call<{ item: { id: string } }>({ method: "POST", path: `/api/docs/${homeId}/items`, body: { parentId: homeId, title: group.title, kind: "group", slug: group.slug } });
		groupIds.set(group.slug, item.id);
	}
	for (const page of ordered.filter((item) => item.kind === "page")) {
		const parentId = page.group ? groupIds.get(page.group) : homeId;
		if (!parentId) throw new Error(`No group "${page.group}" for ${page.slug}.`);
		const { item } = await api.call<{ item: { id: string } }>({ method: "POST", path: `/api/docs/${homeId}/items`, body: { parentId, title: page.title, kind: "page", slug: page.slug } });
		pageIds.set(page, item.id);
	}

	const write = async ({ id, title, description, blocks }: { id: string; title: string; description: string; blocks: BlockConfig[] }): Promise<void> => {
		const page = await api.call<Page>({ method: "GET", path: `/api/pages/${id}` });
		const other = { ...(page.other ?? {}), seo: { ...(page.other?.seo ?? {}), metaDescription: description } };
		await api.call({ method: "PUT", path: `/api/pages/${id}`, body: { title, blocks: replaceDocsPageContent({ blocks: page.blocks, children: blocks }), other, expectedVersion: page.version, ...(args.publish ? { status: "publish" } : {}) } });
	};
	await write({ id: homeId, title: folder.home.title || args.name, description: folder.home.description, blocks: homeBlocks.blocks });
	for (const [page, id] of pageIds) await write({ id, title: page.title, description: page.description, blocks: converted.get(page) ?? [] });
	console.log(`Loaded ${pageIds.size} pages under /${args.slug}${args.publish ? " and published them" : " as drafts"}.`);

	if (args.exportTo) {
		const { theme: _theme, ...file } = await api.call<Record<string, unknown>>({ method: "GET", path: `/api/docs/${homeId}/export?files=1` });
		// The file carries no theme, so bringing the docs in never changes how a site looks.
		writeFileSync(resolve(args.exportTo), JSON.stringify(file));
		console.log(`Wrote the page file to ${args.exportTo}.`);
	}
}

run().catch((error: Error) => {
	console.error(error.message);
	process.exit(1);
});

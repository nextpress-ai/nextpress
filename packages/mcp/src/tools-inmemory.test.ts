import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BLOCK_NAMES,
	createNextpress,
	NextpressError,
	sdkErr,
	sdkOk,
	VERSION_STALE,
	type NextpressClient,
} from "@nextpress-org/sdk";
import { connectMcpSession, resourceText, textPayload, type LinkedSession } from "./test/mcp-session.js";

const SITE_ID = "00000000-0000-4000-8000-000000000001";
const PAGE_ID = "00000000-0000-4000-8000-000000000004";

describe("MCP tools via InMemoryTransport", () => {
	let session: LinkedSession | undefined;

	afterEach(async () => {
		if (session) {
			await session.close();
			session = undefined;
		}
	});

	it("lists content-core tools and resources", async () => {
		const sdk = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "npk_live_test",
			siteId: SITE_ID,
			fetch: vi.fn() as typeof fetch,
		});
		session = await connectMcpSession(sdk);

		const tools = await session.client.listTools();
		const names = tools.tools.map((tool) => tool.name).sort();
		expect(names).toEqual(
			[
				"build_blocks",
				"create_blog",
				"create_page",
				"create_post",
				"get_blog",
				"get_page",
				"get_post",
				"get_site_context",
				"get_template",
				"list_blogs",
				"list_block_types",
				"list_media",
				"list_pages",
				"list_posts",
				"activate_theme",
				"create_theme",
				"get_theme",
				"list_templates",
				"list_themes",
				"update_theme",
				"patch_page_blocks",
				"patch_post_blocks",
				"preview_page",
				"preview_post",
				"publish_page",
				"publish_post",
				"update_page",
				"update_post",
				"upload_media",
				"validate_blocks",
				"apply_page_phone_fixes",
				"change_page_blocks",
				"check_page",
				"copy_brand_logo",
				"create_template_part",
				"get_block_type",
				"get_design_guide",
				"get_page_block",
				"get_page_history",
				"get_page_outline",
				"get_template_part_usage",
				"list_form_submissions",
					"add_docs_page",
					"create_docs",
					"delete_docs_page",
					"get_docs_guide",
					"get_docs_tree",
					"list_docs",
					"reorder_docs_pages",
					"update_docs_page",
					"update_docs_settings",
				"list_template_parts",
				"restore_page_version",
			].sort(),
		);

		const resources = await session.client.listResources();
		const uris = resources.resources.map((resource) => resource.uri).sort();
		expect(uris).toEqual(
			[
				"nextpress://blocks/catalog",
				"nextpress://blocks/schema",
				"nextpress://design-guide",
					"nextpress://docs/guide",
				"nextpress://site/context",
				"nextpress://site/map",
			].sort(),
		);
	});

	it("create_page defaults to draft and returns page JSON", async () => {
		const create = vi.fn(async (input: { status?: string; title: string }) =>
			sdkOk({
				id: PAGE_ID,
				title: input.title,
				slug: "hello",
				status: input.status ?? "draft",
				siteId: SITE_ID,
				version: 0,
			}),
		);

		const sdk = {
			blocks: createNextpress({
				baseUrl: "https://cms.example.com",
				apiKey: "npk_live_test",
				siteId: SITE_ID,
				fetch: vi.fn() as typeof fetch,
			}).blocks,
			site: { get: vi.fn() },
			themes: { getActive: vi.fn() },
			settings: { get: vi.fn() },
			health: { check: vi.fn() },
			pages: {
				list: vi.fn(),
				get: vi.fn(),
				create,
				update: vi.fn(),
			},
			posts: {
				list: vi.fn(),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
			templates: { list: vi.fn(), get: vi.fn() },
			blogs: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
			media: { list: vi.fn(), upload: vi.fn() },
			preview: {
				createShareToken: vi.fn(),
				buildSharePreviewUrl: vi.fn(),
			},
		} as unknown as NextpressClient;

		session = await connectMcpSession(sdk);

		const result = await session.client.callTool({
			name: "create_page",
			arguments: { title: "Hello MCP" },
		});

		expect(result.isError).toBeFalsy();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Hello MCP", status: "draft" }),
		);
		const body = JSON.parse(textPayload(result as { content: Array<{ type: string; text?: string }> }));
		expect(body.id).toBe(PAGE_ID);
		expect(body.status).toBe("draft");
	});

	it("update_page surfaces VERSION_STALE with re-fetch hint", async () => {
		const update = vi.fn(async () =>
			sdkErr(
				new NextpressError({
					message: "Version conflict",
					status: 409,
					code: VERSION_STALE,
				}),
			),
		);

		const sdk = {
			blocks: { names: BLOCK_NAMES, fromName: vi.fn() },
			site: { get: vi.fn() },
			themes: { getActive: vi.fn() },
			settings: { get: vi.fn() },
			health: { check: vi.fn() },
			pages: {
				list: vi.fn(),
				get: vi.fn(),
				create: vi.fn(),
				update,
			},
			posts: {
				list: vi.fn(),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
			templates: { list: vi.fn(), get: vi.fn() },
			blogs: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
			media: { list: vi.fn(), upload: vi.fn() },
			preview: {
				createShareToken: vi.fn(),
				buildSharePreviewUrl: vi.fn(),
			},
		} as unknown as NextpressClient;

		session = await connectMcpSession(sdk);

		const result = await session.client.callTool({
			name: "update_page",
			arguments: {
				id: PAGE_ID,
				expectedVersion: 1,
				title: "Stale write",
			},
		});

		expect(result.isError).toBe(true);
		const body = JSON.parse(
			textPayload(result as { content: Array<{ type: string; text?: string }> }),
		) as { code: string; hint: string };
		expect(body.code).toBe(VERSION_STALE);
		expect(body.hint).toMatch(/expectedVersion/);
	});

	it("build_blocks turns block descriptions into blocks, with names short or long", async () => {
		const sdk = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "npk_live_test",
			siteId: SITE_ID,
			fetch: vi.fn() as typeof fetch,
		});
		session = await connectMcpSession(sdk);

		const result = await session.client.callTool({
			name: "build_blocks",
			arguments: {
				blocks: [
					{ name: "heading", content: { value: "Title", level: 1 } },
					{ name: "core/paragraph", content: { value: "Body" } },
				],
			},
		});

		expect(result.isError).toBeFalsy();
		const body = JSON.parse(
			textPayload(result as { content: Array<{ type: string; text?: string }> }),
		) as { blocks: Array<{ name: string }> };
		expect(body.blocks).toHaveLength(2);
		expect(body.blocks[0].name).toBe("core/heading");
		expect(body.blocks[1].name).toBe("core/paragraph");
	});

	it("reads nextpress://blocks/catalog resource", async () => {
		const sdk = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "npk_live_test",
			siteId: SITE_ID,
			fetch: vi.fn() as typeof fetch,
		});
		session = await connectMcpSession(sdk);

		const resource = await session.client.readResource({
			uri: "nextpress://blocks/catalog",
		});
		const text = resourceText(resource);
		expect(text).toBeTruthy();
		const body = JSON.parse(text) as {
			blocks: Array<{ name: string; agentNote?: string }>;
		};
		expect(body.blocks.length).toBeGreaterThan(10);
		expect(body.blocks.some((block) => block.name === "core/heading")).toBe(true);
	});

	it("gives every block in the catalog resource a note on when to use it", async () => {
		const sdk = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "npk_live_test",
			siteId: SITE_ID,
			fetch: vi.fn() as typeof fetch,
		});
		session = await connectMcpSession(sdk);

		const resource = await session.client.readResource({ uri: "nextpress://blocks/catalog" });
		const body = JSON.parse(resourceText(resource)) as {
			blocks: Array<{ name: string; agentNote?: string }>;
		};

		expect(body.blocks.map((block) => block.name).sort()).toEqual([...BLOCK_NAMES].sort());
		const withoutNote = body.blocks.filter((block) => !block.agentNote || block.agentNote.length < 20);
		expect(withoutNote.map((block) => block.name)).toEqual([]);
		const heading = body.blocks.find((block) => block.name === "core/heading");
		expect(heading?.agentNote).toContain("One level-1 heading per page");
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { isNextpressError } from "../client/nextpress-error.js";
import {
	createTestClient,
	OTHER_SITE_ID,
	readCall,
	TEST_SITE_ID,
} from "../test/create-test-client.js";
import { HOME_ID, PAGE_ID, refusal } from "../test/docs-fixtures.js";

const BINARY = new Uint8Array([0x7b, 0x00, 0xff, 0xfe, 0x80, 0x0d, 0x0a, 0x7d]);

afterEach(() => {
	vi.restoreAllMocks();
});

describe("docs.exportFile", () => {
	const fileResponse = (headers: Record<string, string> = {}) =>
		new Response(BINARY, {
			headers: {
				"content-type": "application/json",
				"content-disposition": 'attachment; filename="acme-docs-docs.nextpress-page.json"',
				...headers,
			},
		});

	it("returns the page file's bytes and name, in the shape pageTransfer.import takes", async () => {
		const { client, calls } = createTestClient([
			{ method: "GET", path: `/api/docs/${HOME_ID}/export`, handler: () => fileResponse() },
		]);

		const file = await client.docs.exportFile({ homeId: HOME_ID });

		expect(file.fileName).toBe("acme-docs-docs.nextpress-page.json");
		expect(file.contentType).toBe("application/json");
		expect(Array.from(file.bytes)).toEqual(Array.from(BINARY));
		expect(readCall(calls[0])).toEqual({
			pathname: `/api/docs/${HOME_ID}/export`,
			query: { siteId: TEST_SITE_ID },
		});
	});

	it("sends includeFiles as 1 or 0, because the server only leaves files out for the text 0", async () => {
		const { client, calls } = createTestClient([
			{ path: `/api/docs/${HOME_ID}/export`, handler: () => fileResponse() },
		]);

		await client.docs.exportFile({ homeId: HOME_ID, includeFiles: false });
		await client.docs.exportFile({ homeId: HOME_ID, includeFiles: true });

		expect(readCall(calls[0]).query.files).toBe("0");
		expect(readCall(calls[1]).query.files).toBe("1");
	});

	it("uses a plain file name when the server sends none", async () => {
		const { client } = createTestClient([
			{
				path: `/api/docs/${HOME_ID}/export`,
				handler: () => fileResponse({ "content-disposition": "" }),
			},
		]);

		const file = await client.docs.exportFile({ homeId: HOME_ID });

		expect(file.fileName).toBe("docs.nextpress-page.json");
	});

	it("hands the exported file to pageTransfer.import on another site, unchanged", async () => {
		const imported = {
			page: {
				id: PAGE_ID,
				title: "Install",
				slug: "install",
				status: "draft",
				siteId: OTHER_SITE_ID,
			},
			pages: [],
			renamed: [],
			files: { refMap: {}, added: [], reused: [], missing: [] },
			theme: { status: "none" },
		};
		const { client, calls } = createTestClient([
			{ path: `/api/docs/${HOME_ID}/export`, handler: () => fileResponse() },
			{
				method: "POST",
				path: "/api/page-transfer/import",
				handler: () => Response.json(imported, { status: 201 }),
			},
		]);

		const file = await client.docs.exportFile({ homeId: HOME_ID });
		const result = await client.pageTransfer.import({
			file: file.bytes,
			fileName: file.fileName,
			siteId: OTHER_SITE_ID,
		});

		expect(result.isOk).toBe(true);
		const part = (calls[1]?.body as FormData).get("package") as File;
		expect(part.name).toBe("acme-docs-docs.nextpress-page.json");
		expect(Array.from(new Uint8Array(await part.arrayBuffer()))).toEqual(Array.from(BINARY));
	});

	it("turns a refusal into a NextpressError", async () => {
		const { client } = createTestClient([
			{
				path: `/api/docs/${HOME_ID}/export`,
				handler: refusal("Too many changes at once. Wait a minute and try again.", 429),
			},
		]);

		const error = await client.docs
			.exportFile({ homeId: HOME_ID })
			.catch((caught: Error) => caught);

		expect(isNextpressError(error)).toBe(true);
		expect(error).toMatchObject({ status: 429 });
	});
});

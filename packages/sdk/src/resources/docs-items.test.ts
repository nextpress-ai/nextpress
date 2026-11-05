import { describe, expect, it } from "vitest";
import { createTestClient, readCall } from "../test/create-test-client.js";
import {
	GROUP_ID,
	HOME_ID,
	OTHER_PAGE_ID,
	PAGE_ID,
	refusal,
	treeItem,
} from "../test/docs-fixtures.js";

describe("docs.addItem", () => {
	it("adds a page under a parent, with its position", async () => {
		const item = treeItem({ id: GROUP_ID, title: "Install", menuOrder: 0 });
		const { client, calls } = createTestClient([
			{
				method: "POST",
				path: `/api/docs/${HOME_ID}/items`,
				handler: () => Response.json({ item }, { status: 201 }),
			},
		]);

		const result = await client.docs.addItem({
			homeId: HOME_ID,
			parentId: HOME_ID,
			title: "Install",
			kind: "page",
			position: 0,
		});

		expect(result.isOk).toBe(true);
		if (!result.isOk) return;
		expect(result.value.item.title).toBe("Install");
		expect(calls[0]?.method).toBe("POST");
		expect(calls[0]?.body).toEqual({
			parentId: HOME_ID,
			title: "Install",
			kind: "page",
			position: 0,
		});
	});

	it("adds a group, which takes no text", async () => {
		const { client, calls } = createTestClient([
			{
				path: `/api/docs/${HOME_ID}/items`,
				handler: () => Response.json({ item: treeItem({ kind: "group" }) }, { status: 201 }),
			},
		]);

		await client.docs.addItem({
			homeId: HOME_ID,
			parentId: HOME_ID,
			title: "Guides",
			kind: "group",
		});

		expect(calls[0]?.body).toEqual({ parentId: HOME_ID, title: "Guides", kind: "group" });
	});

	it("returns an address already in use (409) as an error value", async () => {
		const message = 'Another page already uses "install". Pick a different address.';
		const { client } = createTestClient([
			{ path: `/api/docs/${HOME_ID}/items`, handler: refusal(message, 409) },
		]);

		const result = await client.docs.addItem({
			homeId: HOME_ID,
			parentId: HOME_ID,
			title: "Install",
			kind: "page",
		});

		expect(result.isErr).toBe(true);
		if (!result.isErr) return;
		expect(result.error).toMatchObject({ status: 409, message });
		expect(result.error.code).toBeUndefined();
	});

	it("fails locally on a parent id that is not a UUID, without calling the server", async () => {
		const { client, calls } = createTestClient([]);

		await expect(
			client.docs.addItem({ homeId: HOME_ID, parentId: "home", title: "Install", kind: "page" }),
		).rejects.toThrow("Invalid docs.addItem input: parentId");
		expect(calls).toHaveLength(0);
	});
});

describe("docs.updateItem", () => {
	it("sends only the changes to the page's place, title, address and flags", async () => {
		const item = treeItem({ id: PAGE_ID, title: "Upgrading", slug: "upgrading", hidden: true });
		const { client, calls } = createTestClient([
			{
				method: "PATCH",
				path: `/api/docs/items/${PAGE_ID}`,
				handler: () => Response.json({ item }),
			},
		]);

		const result = await client.docs.updateItem({
			pageId: PAGE_ID,
			title: "Upgrading",
			slug: "upgrading",
			parentId: GROUP_ID,
			hidden: true,
			kind: "page",
		});

		expect(result.isOk).toBe(true);
		expect(calls[0]?.method).toBe("PATCH");
		expect(calls[0]?.body).toEqual({
			title: "Upgrading",
			slug: "upgrading",
			parentId: GROUP_ID,
			hidden: true,
			kind: "page",
		});
	});

	it("refuses a move under itself with the server's words", async () => {
		const message = "A page can't move under itself or a page inside it.";
		const { client } = createTestClient([
			{ path: `/api/docs/items/${GROUP_ID}`, handler: refusal(message, 400) },
		]);

		const result = await client.docs.updateItem({ pageId: GROUP_ID, parentId: PAGE_ID });

		expect(result.isErr).toBe(true);
		if (!result.isErr) return;
		expect(result.error).toMatchObject({ status: 400, message });
	});

	it("fails locally on an empty title, without calling the server", async () => {
		const { client, calls } = createTestClient([]);

		await expect(client.docs.updateItem({ pageId: PAGE_ID, title: "  " })).rejects.toThrow(
			"Invalid docs.updateItem input: title",
		);
		expect(calls).toHaveLength(0);
	});
});

describe("docs.reorder and docs.deleteItem", () => {
	it("sends the full new order of one parent's pages", async () => {
		const { client, calls } = createTestClient([
			{
				method: "PUT",
				path: `/api/docs/${HOME_ID}/order`,
				handler: () => Response.json({ ok: true }),
			},
		]);

		const result = await client.docs.reorder({
			homeId: HOME_ID,
			parentId: GROUP_ID,
			orderedIds: [OTHER_PAGE_ID, PAGE_ID],
		});

		expect(result.isOk).toBe(true);
		expect(calls[0]?.method).toBe("PUT");
		expect(calls[0]?.body).toEqual({ parentId: GROUP_ID, orderedIds: [OTHER_PAGE_ID, PAGE_ID] });
	});

	it("returns an order that does not list the pages exactly (409) as an error value", async () => {
		const message = "The pages changed while you were moving them. Refresh and try again.";
		const { client } = createTestClient([
			{ path: `/api/docs/${HOME_ID}/order`, handler: refusal(message, 409) },
		]);

		const result = await client.docs.reorder({
			homeId: HOME_ID,
			parentId: GROUP_ID,
			orderedIds: [PAGE_ID],
		});

		expect(result.isErr).toBe(true);
		if (!result.isErr) return;
		expect(result.error).toMatchObject({ status: 409, message });
	});

	it("fails locally on more than 1000 pages in one order", async () => {
		const { client, calls } = createTestClient([]);
		const orderedIds = Array.from({ length: 1001 }, () => PAGE_ID);

		await expect(
			client.docs.reorder({ homeId: HOME_ID, parentId: GROUP_ID, orderedIds }),
		).rejects.toThrow("Invalid docs.reorder input");
		expect(calls).toHaveLength(0);
	});

	it("deletes a page", async () => {
		const { client, calls } = createTestClient([
			{
				method: "DELETE",
				path: `/api/docs/items/${PAGE_ID}`,
				handler: () => Response.json({ ok: true }),
			},
		]);

		const result = await client.docs.deleteItem({ pageId: PAGE_ID });

		expect(result.isOk).toBe(true);
		expect(calls[0]?.method).toBe("DELETE");
		expect(readCall(calls[0]).pathname).toBe(`/api/docs/items/${PAGE_ID}`);
	});

	it("refuses to delete a page that still has pages under it (409)", async () => {
		const message = "Move or delete the pages under this one first.";
		const { client } = createTestClient([
			{ path: `/api/docs/items/${GROUP_ID}`, handler: refusal(message, 409) },
		]);

		const result = await client.docs.deleteItem({ pageId: GROUP_ID });

		expect(result.isErr).toBe(true);
		if (!result.isErr) return;
		expect(result.error).toMatchObject({ status: 409, message });
	});
});

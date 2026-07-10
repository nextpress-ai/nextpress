import { describe, expect, it, vi } from "vitest";
import { createEditorSession } from "./create-editor-session.js";
import { sdkOk } from "../client/sdk-result.js";

describe("createEditorSession", () => {
	it("loads a page, edits blocks with undo/redo, and saves", async () => {
		const page = {
			id: "page-1",
			title: "Hello",
			slug: "hello",
			status: "draft",
			version: 0,
			blocks: [{ id: "b1", name: "core/heading", type: "block" as const, parentId: null, content: { kind: "text" as const, value: "Hi" } }],
		};

		const pages = {
			get: vi.fn().mockResolvedValue(page),
			update: vi.fn().mockImplementation(async ({ blocks, status, expectedVersion }) =>
				sdkOk({
					...page,
					blocks,
					status: status ?? page.status,
					version: (expectedVersion ?? 0) + 1,
				}),
			),
			getHistory: vi.fn(),
			restoreVersion: vi.fn(),
		};

		const preview = {
			page: vi.fn(),
			post: vi.fn(),
			template: vi.fn(),
			createShareToken: vi.fn().mockResolvedValue({
				token: "npt_test",
				previewUrl: "http://localhost/preview/page/page-1?token=npt_test",
				expiresAt: new Date().toISOString(),
				expiresInSeconds: 300,
				contentType: "page",
				contentId: "page-1",
			}),
			getShared: vi.fn(),
			buildSharePreviewUrl: vi.fn(),
		};

		const editor = createEditorSession({
			pages: pages as never,
			posts: {} as never,
			templates: {} as never,
			preview: preview as never,
			blocks: {
				heading: ({ text }: { text: string }) => ({
					id: "b2",
					name: "core/heading",
					type: "block" as const,
					parentId: null,
					content: { kind: "text" as const, value: text },
				}),
			} as never,
		});

		await editor.load({ type: "page", id: "page-1" });
		editor.setBlocks([
			...(editor.getBlocks() ?? []),
			{
				id: "b2",
				name: "core/heading",
				type: "block",
				parentId: null,
				content: { kind: "text", value: "Updated" },
			},
		]);

		expect(editor.canUndo()).toBe(true);
		editor.undo();
		expect(editor.getBlocks()).toHaveLength(1);

		const saveResult = await editor.save();
		expect(saveResult.isErr).toBe(false);
		expect(pages.update).toHaveBeenCalledWith(
			expect.objectContaining({ id: "page-1", expectedVersion: 0, blocks: expect.any(Array) }),
		);

		const link = await editor.createPreviewLink({ expiresInSeconds: 300 });
		expect(link.token).toMatch(/^npt_/);
	});
});

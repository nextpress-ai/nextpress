import { afterEach, describe, expect, it } from "vitest";
import {
	blocksForPreviewHandoff,
	getPreviewSessionKey,
	getPreviewSessionSnapshot,
	livePreviewHref,
	resetPreviewSessionForTests,
	resolveLivePreviewBlocks,
	subscribePreviewSession,
	writePreviewSession,
} from "./preview-session";
import type { BlockConfig } from "@shared/schema-types";

const sent: BlockConfig[] = [
	{
		id: "sent",
		name: "core/paragraph",
		type: "block",
		parentId: null,
		content: { kind: "text", value: "sent" },
		styles: {},
		settings: {},
	},
];

const savedTree: BlockConfig[] = [
	{
		id: "saved",
		name: "core/paragraph",
		type: "block",
		parentId: null,
		content: { kind: "text", value: "saved-old" },
		styles: {},
		settings: {},
	},
];

const apiTree: BlockConfig[] = [
	{
		id: "api",
		name: "core/paragraph",
		type: "block",
		parentId: null,
		content: { kind: "text", value: "api" },
		styles: {},
		settings: {},
	},
];

const pageKey = { contentType: "page", contentId: "p1" };

afterEach(() => {
	resetPreviewSessionForTests();
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem(getPreviewSessionKey(pageKey));
	}
});

describe("blocksForPreviewHandoff", () => {
	it("uses the tree the editor just stored, even if the API copy is older", () => {
		expect(
			blocksForPreviewHandoff({ sent, saved: { blocks: savedTree } }),
		).toBe(sent);
	});
});

describe("resolveLivePreviewBlocks", () => {
	it("uses the server copy when the leftover browser copy is older", () => {
		expect(
			resolveLivePreviewBlocks({
				liveSession: {
					blocks: sent,
					savedAt: Date.parse("2026-09-01T00:00:00.000Z"),
				},
				apiBlocks: apiTree,
				apiUpdatedAt: "2026-09-28T00:00:00.000Z",
			}),
		).toBe(apiTree);
	});

	it("uses the browser copy when it is at least as new as the server copy", () => {
		expect(
			resolveLivePreviewBlocks({
				liveSession: {
					blocks: sent,
					savedAt: Date.parse("2026-09-28T12:00:00.000Z"),
				},
				apiBlocks: apiTree,
				apiUpdatedAt: "2026-09-28T11:00:00.000Z",
			}),
		).toBe(sent);
	});

	it("uses the server copy when there is no leftover browser copy", () => {
		expect(
			resolveLivePreviewBlocks({
				liveSession: null,
				apiBlocks: apiTree,
				apiUpdatedAt: "2026-09-28T00:00:00.000Z",
			}),
		).toBe(apiTree);
	});
});

describe("writePreviewSession", () => {
	it("keeps the snapshot identity stable until the stored tree changes", () => {
		writePreviewSession({
			...pageKey,
			payload: { blocks: sent, savedAt: 100 },
		});
		const first = getPreviewSessionSnapshot(pageKey);
		const second = getPreviewSessionSnapshot(pageKey);
		expect(first).toBe(second);
	});

	it("notifies subscribers so an open preview can drop a removed block", () => {
		let calls = 0;
		const stop = subscribePreviewSession(() => {
			calls += 1;
		});
		writePreviewSession({
			...pageKey,
			payload: { blocks: sent, savedAt: Date.now() },
		});
		expect(calls).toBeGreaterThan(0);
		expect(getPreviewSessionSnapshot(pageKey)?.blocks).toBe(sent);
		stop();
	});
});

describe("livePreviewHref", () => {
	it("opens live preview with a fresh load token", () => {
		const href = livePreviewHref({ contentType: "page", contentId: "abc" });
		expect(href.startsWith("/preview/page/abc?live=1&at=")).toBe(true);
	});
});

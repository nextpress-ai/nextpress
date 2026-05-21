import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
	triggerEntryAnimationPreview,
	clearEntryAnimationPreview,
	getEntryAnimationPreviewState,
} from "@/lib/entry-animation-preview-store";

async function flushPreviewQueue(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

describe("entry-animation-preview-store", () => {
	beforeEach(() => {
		clearEntryAnimationPreview();
		vi.stubGlobal(
			"requestAnimationFrame",
			(callback: FrameRequestCallback) => {
				callback(0);
				return 0;
			},
		);
	});

	afterEach(() => {
		clearEntryAnimationPreview();
		vi.unstubAllGlobals();
	});

	it("stores preview params with an incrementing token", async () => {
		triggerEntryAnimationPreview({
			blockId: "block_a",
			animName: "fadeIn",
			durationMs: 1000,
			delayMs: 0,
		});
		await flushPreviewQueue();

		const first = getEntryAnimationPreviewState();
		expect(first).toEqual({
			blockId: "block_a",
			animName: "fadeIn",
			durationMs: 1000,
			delayMs: 0,
			token: 1,
		});

		triggerEntryAnimationPreview({
			blockId: "block_a",
			animName: "fadeInUp",
			durationMs: 800,
			delayMs: 100,
		});
		await flushPreviewQueue();

		const second = getEntryAnimationPreviewState();
		expect(second).toEqual({
			blockId: "block_a",
			animName: "fadeInUp",
			durationMs: 800,
			delayMs: 100,
			token: 2,
		});
	});

	it("clears preview state when animation finishes", async () => {
		triggerEntryAnimationPreview({
			blockId: "block_a",
			animName: "fadeIn",
			durationMs: 1000,
			delayMs: 0,
		});
		await flushPreviewQueue();

		const token = getEntryAnimationPreviewState()?.token;
		clearEntryAnimationPreview(token);
		expect(getEntryAnimationPreviewState()).toBeNull();
	});

	it("ignores stale clear requests", async () => {
		triggerEntryAnimationPreview({
			blockId: "block_a",
			animName: "fadeIn",
			durationMs: 1000,
			delayMs: 0,
		});
		await flushPreviewQueue();

		const active = getEntryAnimationPreviewState();
		expect(active).not.toBeNull();
		clearEntryAnimationPreview((active?.token ?? 0) - 1);
		expect(getEntryAnimationPreviewState()).toEqual(active);
	});
});

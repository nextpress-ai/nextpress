import { describe, expect, it } from "vitest";
import {
	DELETE_DRAFT_SAVE_MS,
	EDIT_DRAFT_SAVE_MS,
	draftSaveDelayMs,
	shouldFlushDraftOnLeave,
} from "@/lib/draft-save-delay";

describe("draftSaveDelayMs", () => {
	it("keeps ordinary edits on the short delay", () => {
		expect(draftSaveDelayMs("edit")).toBe(EDIT_DRAFT_SAVE_MS);
		expect(EDIT_DRAFT_SAVE_MS).toBe(300);
	});

	it("waits much longer after a removal", () => {
		expect(draftSaveDelayMs("delete")).toBe(DELETE_DRAFT_SAVE_MS);
		expect(DELETE_DRAFT_SAVE_MS).toBeGreaterThan(EDIT_DRAFT_SAVE_MS * 10);
	});
});

describe("shouldFlushDraftOnLeave", () => {
	it("does not store a waiting removal when leaving the editor", () => {
		expect(shouldFlushDraftOnLeave({ pendingDelete: true })).toBe(false);
		expect(shouldFlushDraftOnLeave({ pendingDelete: false })).toBe(true);
	});
});

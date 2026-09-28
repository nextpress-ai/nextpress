/** Typing and layout edits write a local copy quickly. */
export const EDIT_DRAFT_SAVE_MS = 300;

/**
 * Removals wait much longer so Undo can win, and so a mass delete is not stored
 * before the person has looked at the page.
 */
export const DELETE_DRAFT_SAVE_MS = 10_000;

export type DraftSaveCause = "edit" | "delete";

/** Delay before writing the local editor copy. Removals stay off the fast path. */
export function draftSaveDelayMs(cause: DraftSaveCause): number {
	return cause === "delete" ? DELETE_DRAFT_SAVE_MS : EDIT_DRAFT_SAVE_MS;
}

/**
 * Leaving with a removal still waiting should keep the last stored copy.
 * Save is how a removal becomes lasting.
 */
export function shouldFlushDraftOnLeave({
	pendingDelete,
}: {
	pendingDelete: boolean;
}): boolean {
	return !pendingDelete;
}

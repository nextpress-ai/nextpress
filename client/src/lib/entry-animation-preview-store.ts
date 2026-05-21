import { useSyncExternalStore } from "react";

export type EntryAnimationPreviewState = {
	blockId: string;
	animName: string;
	durationMs: number;
	delayMs: number;
	token: number;
};

let previewState: EntryAnimationPreviewState | null = null;
let previewToken = 0;
const subscribers = new Set<() => void>();

function emitChange(): void {
	subscribers.forEach((callback) => callback());
}

function commitPreview(params: {
	blockId: string;
	animName: string;
	durationMs: number;
	delayMs: number;
}): void {
	previewToken += 1;
	previewState = { ...params, token: previewToken };
	emitChange();
}

/**
 * Requests an entry animation preview on the editor canvas.
 * Clears and re-applies when the same block is previewed again so the animation restarts.
 */
export function triggerEntryAnimationPreview(params: {
	blockId: string;
	animName: string;
	durationMs: number;
	delayMs: number;
}): void {
	queueMicrotask(() => {
		runEntryAnimationPreview(params);
	});
}

function runEntryAnimationPreview(params: {
	blockId: string;
	animName: string;
	durationMs: number;
	delayMs: number;
}): void {
	if (previewState?.blockId === params.blockId) {
		previewState = null;
		emitChange();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				commitPreview(params);
			});
		});
		return;
	}

	commitPreview(params);
}

/** Clears the active entry preview after playback finishes. */
export function clearEntryAnimationPreview(expectedToken?: number): void {
	if (expectedToken !== undefined && previewState?.token !== expectedToken) {
		return;
	}
	if (!previewState) return;
	previewState = null;
	emitChange();
}

function subscribe(callback: () => void): () => void {
	subscribers.add(callback);
	return () => {
		subscribers.delete(callback);
	};
}

function getSnapshot(): EntryAnimationPreviewState | null {
	return previewState;
}

/** Test-only snapshot read — avoids mounting React hooks in unit tests. */
export function getEntryAnimationPreviewState(): EntryAnimationPreviewState | null {
	return getSnapshot();
}

/** Returns the active preview request when it targets the given block. */
export function useBlockEntryAnimationPreview(
	blockId: string,
): EntryAnimationPreviewState | null {
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	if (!snapshot || snapshot.blockId !== blockId) {
		return null;
	}
	return snapshot;
}

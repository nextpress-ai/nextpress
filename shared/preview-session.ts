import type { BlockConfig, PageOther } from "@shared/schema-types";

export type PreviewSessionPayload = {
	blocks: BlockConfig[];
	title?: string;
	design?: PageOther["design"];
	savedAt: number;
};

const STORAGE_PREFIX = "npb-preview:";
const CHANNEL_NAME = "npb-preview-session";
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

const listeners = new Set<() => void>();
const snapshotByKey = new Map<
	string,
	{ raw: string | null; value: PreviewSessionPayload | null }
>();

let channel: BroadcastChannel | null | undefined;
let windowBound = false;

/** Builds localStorage key for editor → preview handoff. */
export const getPreviewSessionKey = ({
	contentType,
	contentId,
}: {
	contentType: string;
	contentId: string;
}): string => `${STORAGE_PREFIX}${contentType}:${contentId}`;

/**
 * Preview must show the tree the editor just stored, not an older API copy.
 */
export function blocksForPreviewHandoff({
	sent,
	saved,
}: {
	sent: BlockConfig[];
	saved?: { blocks?: unknown } | false | null;
}): BlockConfig[] {
	if (Array.isArray(sent)) return sent;
	if (saved && typeof saved === "object" && Array.isArray(saved.blocks)) {
		return saved.blocks as BlockConfig[];
	}
	return [];
}

/**
 * `?live=1` used to keep any leftover browser copy, so a Save that dropped a
 * block still showed it. Use the server copy when it is newer than that copy.
 */
export function resolveLivePreviewBlocks({
	liveSession,
	apiBlocks,
	apiUpdatedAt,
}: {
	liveSession: PreviewSessionPayload | null;
	apiBlocks: BlockConfig[];
	apiUpdatedAt?: string | Date | null;
}): BlockConfig[] {
	const liveBlocks =
		liveSession && Array.isArray(liveSession.blocks) ? liveSession.blocks : null;
	if (!liveBlocks || liveBlocks.length === 0) return apiBlocks;

	const apiTime =
		apiUpdatedAt == null || apiUpdatedAt === ""
			? Number.NaN
			: new Date(apiUpdatedAt).getTime();
	if (!Number.isFinite(apiTime)) return liveBlocks;

	if ((liveSession?.savedAt ?? 0) >= apiTime) return liveBlocks;
	return apiBlocks;
}

function parseSessionRaw({
	raw,
	maxAgeMs,
}: {
	raw: string | null;
	maxAgeMs: number;
}): PreviewSessionPayload | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as PreviewSessionPayload;
		if (!Array.isArray(parsed.blocks)) return null;
		if (Date.now() - (parsed.savedAt ?? 0) > maxAgeMs) return null;
		return parsed;
	} catch {
		return null;
	}
}

function emitPreviewSessionChange(): void {
	for (const listener of listeners) listener();
}

function getPreviewChannel(): BroadcastChannel | null {
	if (channel !== undefined) return channel;
	if (typeof BroadcastChannel === "undefined") {
		channel = null;
		return null;
	}
	try {
		channel = new BroadcastChannel(CHANNEL_NAME);
		channel.onmessage = () => emitPreviewSessionChange();
	} catch {
		channel = null;
	}
	return channel;
}

function bindPreviewSessionWindow(): void {
	if (windowBound || typeof window === "undefined") return;
	windowBound = true;
	window.addEventListener("storage", (event) => {
		if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) return;
		snapshotByKey.delete(event.key);
		emitPreviewSessionChange();
	});
	getPreviewChannel();
}

/** Tells open preview tabs to re-read the stored tree. */
export function notifyPreviewSessionChanged(): void {
	emitPreviewSessionChange();
	getPreviewChannel()?.postMessage({ at: Date.now() });
}

/**
 * Subscribe to preview handoff writes. Same identity every call so
 * useSyncExternalStore does not resubscribe each render.
 */
export function subscribePreviewSession(listener: () => void): () => void {
	bindPreviewSessionWindow();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Stable snapshot for useSyncExternalStore. Same object while the stored
 * string has not changed, so React does not loop.
 */
export function getPreviewSessionSnapshot({
	contentType,
	contentId,
	maxAgeMs = DEFAULT_MAX_AGE_MS,
}: {
	contentType: string;
	contentId: string;
	maxAgeMs?: number;
}): PreviewSessionPayload | null {
	const key = getPreviewSessionKey({ contentType, contentId });
	let raw: string | null = null;
	if (typeof localStorage !== "undefined") {
		try {
			raw = localStorage.getItem(key);
		} catch {
			return snapshotByKey.get(key)?.value ?? null;
		}
	} else {
		const memory = snapshotByKey.get(key);
		if (
			memory?.value &&
			Date.now() - (memory.value.savedAt ?? 0) > maxAgeMs
		) {
			return null;
		}
		return memory?.value ?? null;
	}

	const cached = snapshotByKey.get(key);
	if (cached && cached.raw === raw) {
		if (
			cached.value &&
			Date.now() - (cached.value.savedAt ?? 0) > maxAgeMs
		) {
			return null;
		}
		return cached.value;
	}

	const value = parseSessionRaw({ raw, maxAgeMs });
	snapshotByKey.set(key, { raw, value });
	return value;
}

/** Persists live editor blocks so preview matches canvas before/after save. */
export const writePreviewSession = ({
	contentType,
	contentId,
	payload,
}: {
	contentType: string;
	contentId: string;
	payload: PreviewSessionPayload;
}): void => {
	const key = getPreviewSessionKey({ contentType, contentId });
	const raw = JSON.stringify(payload);
	snapshotByKey.set(key, { raw, value: payload });
	if (typeof localStorage !== "undefined") {
		try {
			localStorage.setItem(key, raw);
		} catch {
			// Quota or private mode — in-memory copy still notifies open previews.
		}
	}
	notifyPreviewSessionChanged();
};

/** Reads handoff payload; returns null when missing or stale (>30 min). */
export const readPreviewSession = ({
	contentType,
	contentId,
	maxAgeMs = DEFAULT_MAX_AGE_MS,
}: {
	contentType: string;
	contentId: string;
	maxAgeMs?: number;
}): PreviewSessionPayload | null =>
	getPreviewSessionSnapshot({ contentType, contentId, maxAgeMs });

/** Live preview URL. `at` forces a fresh load when a leftover tab reused the path. */
export function livePreviewHref({
	contentType,
	contentId,
}: {
	contentType: string;
	contentId: string;
}): string {
	return `/preview/${contentType}/${contentId}?live=1&at=${Date.now()}`;
}

/** Test helper: drop listeners and cached snapshots between cases. */
export function resetPreviewSessionForTests(): void {
	listeners.clear();
	snapshotByKey.clear();
}

import type { BlockConfig, PageOther } from "@shared/schema-types";

export type PreviewSessionPayload = {
	blocks: BlockConfig[];
	title?: string;
	design?: PageOther["design"];
	savedAt: number;
};

const STORAGE_PREFIX = "npb-preview:";

/** Builds localStorage key for editor → preview handoff. */
export const getPreviewSessionKey = ({
	contentType,
	contentId,
}: {
	contentType: string;
	contentId: string;
}): string => `${STORAGE_PREFIX}${contentType}:${contentId}`;

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
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(
			getPreviewSessionKey({ contentType, contentId }),
			JSON.stringify(payload),
		);
	} catch {
		// Quota or private mode — preview falls back to API blocks.
	}
};

/** Reads handoff payload; returns null when missing or stale (>30 min). */
export const readPreviewSession = ({
	contentType,
	contentId,
	maxAgeMs = 30 * 60 * 1000,
}: {
	contentType: string;
	contentId: string;
	maxAgeMs?: number;
}): PreviewSessionPayload | null => {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(
			getPreviewSessionKey({ contentType, contentId }),
		);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as PreviewSessionPayload;
		if (!Array.isArray(parsed.blocks)) return null;
		if (Date.now() - (parsed.savedAt ?? 0) > maxAgeMs) return null;
		return parsed;
	} catch {
		return null;
	}
};

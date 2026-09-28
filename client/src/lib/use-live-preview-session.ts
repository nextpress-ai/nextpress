import { useCallback, useSyncExternalStore } from "react";
import {
	getPreviewSessionSnapshot,
	subscribePreviewSession,
	type PreviewSessionPayload,
} from "@shared/preview-session";

/**
 * Live preview (`?live=1`) must re-read the editor handoff when Save or a
 * removal writes a new tree. Open tabs do not reload on their own.
 */
export function useLivePreviewSession({
	contentType,
	contentId,
	enabled,
}: {
	contentType: string;
	contentId?: string;
	enabled: boolean;
}): PreviewSessionPayload | null {
	const getSnapshot = useCallback((): PreviewSessionPayload | null => {
		if (!enabled || !contentId) return null;
		return getPreviewSessionSnapshot({ contentType, contentId });
	}, [contentId, contentType, enabled]);

	return useSyncExternalStore(
		subscribePreviewSession,
		getSnapshot,
		() => null,
	);
}

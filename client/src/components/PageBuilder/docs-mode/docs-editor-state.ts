import { useCallback, useState } from "react";
import type { PageOther } from "@shared/schema-types";
import { readDocsPageDraft } from "./docs-page-draft";
import type { DocsPageDraft } from "./docs-types";

/**
 * What the docs editor keeps outside the page builder's own state, owned by the editor page so the
 * header (Publish) and the builder (canvas, panels) read the same copy: the settings that live in `page.other`.
 */
export type DocsEditorState = {
	/** The Page tab's description and sidebar flag: edited here, saved with the page. */
	draft: DocsPageDraft;
	setDraft: (patch: Partial<DocsPageDraft>) => void;
	/** Starts again for a page that just loaded (or its saved local copy): its own settings. */
	loadPage: (other: PageOther | null | undefined) => void;
};

export function useDocsEditorState(): DocsEditorState {
	const [draft, setDraftState] = useState<DocsPageDraft>({ description: "", hidden: false });

	const setDraft = useCallback((patch: Partial<DocsPageDraft>) => setDraftState((current) => ({ ...current, ...patch })), []);
	const loadPage = useCallback((other: PageOther | null | undefined) => {
		setDraftState(readDocsPageDraft(other));
	}, []);

	return { draft, setDraft, loadPage };
}

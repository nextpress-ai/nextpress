import { createContext, useCallback, useContext, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { findBlock } from "@/lib/handlers/treeUtils";
import type { BlockDefinition } from "../blocks/types";
import type { WritingResult } from "../docs-mode/docs-writing";

/**
 * What typing in a paragraph or heading needs from the editor it sits in: the docs editor and the
 * blog writing editor both give it, so Enter, Backspace, markers and the "/" menu work the same in
 * a docs page and in a post.
 */
export type WritingValue = {
	/** The whole tree as it is now, for edits that build on it. */
	getBlocks: () => BlockConfig[];
	/** A writing edit as one undo step; then the block to write in next opens, caret placed. */
	applyWriting: (result: Omit<WritingResult, "editId"> & { editId: string | null }) => void;
	/** Where the caret goes when this block's text opens, if an edit asked; read once. */
	takeCaret: (blockId: string) => WritingResult["caret"] | null;
	/** What the "/" menu offers, in the order of the editor's block list. */
	menuBlocks: BlockDefinition[];
};

const WritingContext = createContext<WritingValue | null>(null);

/** Blocks a writing edit leaves open for typing; the rest are picked, so their settings show. */
const OPENS_FOR_TYPING: ReadonlySet<string> = new Set(["core/paragraph", "core/heading", "core/list", "core/quote", "core/code"]);

type ProviderProps = {
	getBlocks: () => BlockConfig[];
	commitBlocks: (next: BlockConfig[]) => void;
	selectBlock: (id: string | null) => void;
	/** Picks a block and opens it for typing, as a double-click does. */
	startEditing: (id: string) => void;
	menuBlocks: BlockDefinition[];
	children: ReactNode;
};

/** Gives the paragraphs and headings below it the editor's writing actions. */
export function WritingProvider({ getBlocks, commitBlocks, selectBlock, startEditing, menuBlocks, children }: ProviderProps): ReactElement {
	const caretRequest = useRef<{ id: string; caret: WritingResult["caret"] } | null>(null);
	const applyWriting = useCallback<WritingValue["applyWriting"]>(
		({ blocks: next, editId, caret }) => {
			commitBlocks(next);
			if (!editId) {
				selectBlock(null);
				return;
			}
			caretRequest.current = { id: editId, caret };
			const edited = findBlock(next, editId);
			if (edited && OPENS_FOR_TYPING.has(edited.name)) startEditing(editId);
			else selectBlock(editId);
		},
		[commitBlocks, selectBlock, startEditing],
	);
	const takeCaret = useCallback((blockId: string) => {
		const request = caretRequest.current;
		if (!request || request.id !== blockId) return null;
		caretRequest.current = null;
		return request.caret;
	}, []);
	const value = useMemo<WritingValue>(() => ({ getBlocks, applyWriting, takeCaret, menuBlocks }), [applyWriting, getBlocks, menuBlocks, takeCaret]);
	return <WritingContext.Provider value={value}>{children}</WritingContext.Provider>;
}

/** Null outside an editor that writes (the page builder): fields then behave as plain fields. */
export const useWriting = (): WritingValue | null => useContext(WritingContext);

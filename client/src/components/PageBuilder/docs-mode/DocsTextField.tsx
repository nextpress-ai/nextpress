import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Box } from "lucide-react";
import type { JsonObject } from "@shared/blocks/docs-types";
import { inlineMarkdown } from "@shared/content-text/html-text";
import { escapeHtml } from "@shared/markdown/inline-html";
import { cn } from "@/lib/utils";
import { InlineTextEditor } from "../blocks/shared/inline-text-editor";
import type { BlockDefinition } from "../blocks/types";
import { generateBlockId } from "../utils";
import { useWriting } from "../writing/writing-context";
import { readSlashQuery, readWritingTurn, removeEmptyBlock, replaceBlock, splitBlock, splitText, textFields } from "./docs-writing";

/** Blocks picked from the "/" menu start empty where the catalog's sample text would only be deleted. */
const EMPTY_START: Readonly<Record<string, JsonObject>> = {
	"core/heading": { value: "", format: "html" },
	"core/paragraph": { value: "", format: "html" },
	"core/list": { values: "<li></li>" },
};

/** What the writer types and reads: the stored words as inline markdown (plain text is escaped first, so a lone `*` stays a `*`). */
const toMarkdown = ({ value, format }: { value: string; format?: string }): string => inlineMarkdown(format === "html" ? value : escapeHtml(value));

const MENU_LIMIT = 8;

/** How well a block's name fits what was typed: its name starts with it, holds it, or only its description does. */
const fitOf = ({ block, query }: { block: BlockDefinition; query: string }): number => {
	const name = block.label.toLowerCase();
	if (name.startsWith(query)) return 0;
	return name.includes(query) ? 1 : 2;
};

/** Docs blocks whose name or description holds every word typed after the "/", best names first. */
function matchBlocks({ blocks, query }: { blocks: BlockDefinition[]; query: string }): BlockDefinition[] {
	const typed = query.trim().toLowerCase();
	const words = typed.split(/\s+/).filter(Boolean);
	return blocks
		.filter((block) => words.every((word) => `${block.label} ${block.description ?? ""}`.toLowerCase().includes(word)))
		.map((block, order) => ({ block, order, fit: fitOf({ block, query: typed }) }))
		.sort((a, b) => a.fit - b.fit || a.order - b.order)
		.map(({ block }) => block)
		.slice(0, MENU_LIMIT);
}

type Props = {
	blockId: string;
	/** The block's stored words: inline HTML when `format` is "html", otherwise plain text. */
	value: string;
	format?: string;
	/** Called with the fields to save: the words as inline HTML, marked as such. */
	onChange: (fields: { value: string; format: "html" }) => void;
	/** A paragraph also turns into other blocks (markers, the "/" menu); a heading only splits on Enter. */
	kind: "paragraph" | "heading";
	placeholder: string;
	ariaLabel: string;
};

/**
 * Typing in a docs paragraph or heading, as in a document: Enter starts a new paragraph (Shift+Enter
 * is a line break), Backspace in an empty one removes it and carries on in the block above, typing
 * `## `, `- `, `1. `, `[] `, `> ` or three backticks at the start makes that block, and "/" opens a
 * menu of the editor's blocks to pick by name. Outside an editor that writes it is the plain field.
 */
export function DocsTextField({ blockId, value: stored, format, onChange, kind, placeholder, ariaLabel }: Props): ReactElement {
	// The writer's own text is kept as typed (a trailing space must survive); the stored words are only read back when something else changed them, such as undo.
	const [value, setValue] = useState(() => toMarkdown({ value: stored, format }));
	const lastSaved = useRef(stored);
	useEffect(() => {
		if (stored === lastSaved.current) return;
		lastSaved.current = stored;
		setValue(toMarkdown({ value: stored, format }));
	}, [stored, format]);
	const docs = useWriting();
	const menuId = useId();
	const [caret] = useState(() => docs?.takeCaret(blockId) ?? "end");
	const [active, setActive] = useState(0);
	const [dismissedAt, setDismissedAt] = useState<string | null>(null);
	const blocks = useMemo(() => docs?.menuBlocks ?? [], [docs?.menuBlocks]);

	const query = kind === "paragraph" ? readSlashQuery(value) : null;
	const menuOpen = query !== null && dismissedAt !== value;
	const options = useMemo(() => (query === null ? [] : matchBlocks({ blocks, query })), [blocks, query]);
	const activeIndex = Math.min(active, Math.max(0, options.length - 1));

	const pick = (block: BlockDefinition): void => {
		if (!docs) return;
		const result = replaceBlock({ blocks: docs.getBlocks(), blockId, name: block.id, data: EMPTY_START[block.id], newId: generateBlockId });
		if (result) docs.applyWriting(result);
	};

	const change = (next: string): void => {
		setActive(0);
		const turn = docs && kind === "paragraph" ? readWritingTurn({ previous: value, next }) : null;
		const result = turn && docs ? replaceBlock({ blocks: docs.getBlocks(), blockId, name: turn.name, data: turn.data, newId: generateBlockId }) : null;
		if (result && docs) {
			docs.applyWriting(result);
			return;
		}
		const fields = textFields(next);
		lastSaved.current = fields.value as string;
		setValue(next);
		onChange({ value: fields.value as string, format: "html" });
	};

	const keyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
		if (!docs || event.nativeEvent.isComposing) return;
		if (menuOpen && options.length > 0) {
			const moves: Record<string, () => void> = {
				ArrowDown: () => setActive((activeIndex + 1) % options.length),
				ArrowUp: () => setActive((activeIndex - 1 + options.length) % options.length),
				Enter: () => pick(options[activeIndex]),
				Escape: () => setDismissedAt(value),
			};
			const move = moves[event.key];
			if (move) {
				event.preventDefault();
				event.stopPropagation();
				move();
				return;
			}
		}
		const el = event.currentTarget;
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			const { before, after } = splitText({ text: value, start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length });
			const result = splitBlock({ blocks: docs.getBlocks(), blockId, before, after, newId: generateBlockId });
			if (result) docs.applyWriting(result);
			return;
		}
		if (event.key === "Backspace" && value === "") {
			event.preventDefault();
			const result =
				kind === "heading"
					? replaceBlock({ blocks: docs.getBlocks(), blockId, name: "core/paragraph", data: EMPTY_START["core/paragraph"], newId: generateBlockId })
					: removeEmptyBlock({ blocks: docs.getBlocks(), blockId });
			if (result) docs.applyWriting(result);
		}
	};

	const optionId = (index: number): string => `${menuId}-option-${index}`;

	return (
		<div className="relative">
			<InlineTextEditor
				value={value}
				onChange={change}
				onKeyDown={keyDown}
				focusAt={caret}
				style={{ color: "inherit", font: "inherit", lineHeight: "inherit" }}
				growToWrap
				placeholder={placeholder}
				ariaLabel={ariaLabel}
				fieldAria={menuOpen ? { "aria-controls": menuId, "aria-activedescendant": options.length > 0 ? optionId(activeIndex) : undefined } : undefined}
			/>
			{menuOpen ? (
				<div
					id={menuId}
					role="listbox"
					aria-label="Docs blocks"
					className="npb-slash-menu absolute left-0 top-full z-20 mt-1 w-72 max-w-full overflow-hidden rounded-[var(--npb-radius-surface)] border border-npb-border-default bg-npb-surface-overlay p-1 text-left font-sans text-sm shadow-lg"
				>
					{options.length === 0 ? (
						<p className="px-2 py-2 text-npb-text-muted">No docs block matches “{query}”. Keep typing, or press Escape.</p>
					) : (
						options.map((block, index) => (
							<div
								key={block.id}
								id={optionId(index)}
								role="option"
								aria-selected={index === activeIndex}
								onMouseDown={(event) => {
									// Keeps the focus in the paragraph, so picking reads as typing.
									event.preventDefault();
									pick(block);
								}}
								onMouseEnter={() => setActive(index)}
								className={cn(
									"flex cursor-pointer items-center gap-2.5 rounded-[var(--npb-radius-input)] px-2 py-1.5",
									index === activeIndex ? "bg-npb-interactive-bg-active text-npb-interactive-text-active" : "text-npb-text-primary",
								)}
							>
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--npb-radius-input)] bg-npb-surface-inset">
									{block.icon ? <block.icon className="h-4 w-4 text-npb-text-secondary" aria-hidden /> : <Box className="h-4 w-4 text-npb-text-secondary" aria-hidden />}
								</span>
								<span className="min-w-0">
									<span className="block truncate font-medium">{block.label}</span>
									{block.description ? <span className="block truncate text-xs text-npb-text-muted">{block.description}</span> : null}
								</span>
							</div>
						))
					)}
					<p className="border-t border-npb-divider px-2 pb-1 pt-1.5 text-xs text-npb-text-muted">↑ ↓ to move, Enter to add, Esc to close</p>
				</div>
			) : null}
		</div>
	);
}

import React, { useState } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { ChevronDown, ChevronUp, MessageSquareShare, X } from "lucide-react";
import {
	DEFAULT_POPUP_CONTENT,
	POPUP_SIZE_WIDTH,
	popupHref,
	readPopupContent,
	type PopupContent,
} from "@shared/popup-model";
import { ContainerChildren } from "../../BlockRenderer";
import { usePagePopups } from "../../popup-links";
import { createBlockDefinition } from "../createBlockDefinition";
import { PopupSettings } from "./popup-settings";

const UNITS = { spacing: "px", font: "rem", dimension: "px", border: "px" } as const;

/** A new popup starts with a heading and a line of text to replace. */
function buildStarterPopupChildren({ parentId, newId }: { parentId: string; newId: () => string }): BlockConfig[] {
	const base = { parentId, settings: {}, other: { tokenMap: {}, units: { ...UNITS } } };
	return [
		{
			...base,
			id: newId(),
			name: "core/heading",
			label: "Heading",
			type: "block",
			category: "basic",
			content: { kind: "text", value: "Stay in the loop", level: 2 },
			styles: { margin: "0 0 8px", fontSize: "1.5rem", fontWeight: "600" },
		},
		{
			...base,
			id: newId(),
			name: "core/paragraph",
			label: "Paragraph",
			type: "block",
			category: "basic",
			content: { kind: "text", value: "Tell visitors what they get, then add a button or form." },
			styles: { margin: "0" },
		},
	];
}

type PopupCanvasProps = {
	hostBlock: BlockConfig;
	content: PopupContent;
	isPreview?: boolean;
	onNestedBlockChange?: (updated: BlockConfig) => void;
};

/**
 * On the canvas a popup is a labelled strip in the page flow (visitors never see it there).
 * "Show" opens its card in place to edit what is inside, at the width visitors will see.
 */
function PopupCanvas({ hostBlock, content, isPreview, onNestedBlockChange }: PopupCanvasProps) {
	const [shown, setShown] = useState(true);
	const { linkCounts } = usePagePopups();
	const links = linkCounts[content.slug] ?? 0;

	return (
		<div className="npb-popup-canvas rounded-md border border-dashed border-npb-border-strong bg-npb-surface-inset/60">
			<div className="flex items-center gap-3 px-3 py-2 text-sm">
				<MessageSquareShare className="h-4 w-4 shrink-0 text-npb-text-muted" aria-hidden />
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-npb-text-primary">Popup · {content.name}</p>
					<p className="truncate text-xs text-npb-text-muted">
						{links > 0
							? `Opens from ${links} ${links === 1 ? "link" : "links"} to ${popupHref(content.slug)}`
							: `Nothing opens it yet. Point a button to ${popupHref(content.slug)}.`}
					</p>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-npb-text-secondary hover:bg-npb-interactive-bg-hover"
					aria-expanded={shown}
					onClick={(event) => {
						event.stopPropagation();
						setShown((value) => !value);
					}}
				>
					{shown ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
					{shown ? "Hide" : "Show"}
				</button>
			</div>
			{shown ? (
				<div className="px-3 pb-4">
					<div className="np-popup__panel mx-auto" style={{ maxWidth: POPUP_SIZE_WIDTH[content.size] }}>
						{content.closeButton ? (
							<span className="np-popup__close" aria-hidden="true">
								<X className="h-4 w-4" />
							</span>
						) : null}
						<ContainerChildren block={hostBlock} isPreview={isPreview ?? false} onBlockChange={onNestedBlockChange} />
					</div>
				</div>
			) : null}
		</div>
	);
}

const PopupBlock = createBlockDefinition<PopupContent>({
	id: "core/popup",
	label: "Popup",
	icon: MessageSquareShare,
	description: "A window over the page, opened by a button or link",
	category: "layout",
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_POPUP_CONTENT,
	defaultStyles: { padding: "0", margin: "0" },
	defaultChildren: buildStarterPopupChildren,
	parseContent: (raw) => readPopupContent(raw),
	settings: PopupSettings,
	hasSettings: true,
	render: ({ value, content, isPreview, onNestedBlockChange }) => (
		<PopupCanvas hostBlock={value} content={content} isPreview={isPreview} onNestedBlockChange={onNestedBlockChange} />
	),
});

export default PopupBlock;

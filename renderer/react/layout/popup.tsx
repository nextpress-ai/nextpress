import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { readPopupContent } from "@shared/popup-model";
import { getRenderProps } from "../render-helpers";

/**
 * Popup Block Component — a closed `<dialog>` until a `#popup-<name>` link (or the page address)
 * opens it; `vendor/popup.js` (published) or `popup-runtime` (in-app view) does the opening.
 * The block's own styles (layout, gap) go on the card, never on the dialog, so they cannot break
 * centring; spacing is left to the popup's padding setting.
 */
export function PopupBlock(block: BlockConfig) {
	const { style, className, attributes, children } = getRenderProps(block);
	const content = readPopupContent(block.content);
	// The card's padding comes from the popup's own setting (its CSS); block spacing would override it.
	const { padding: _padding, margin: _margin, ...panelStyle } = style;
	return (
		<dialog
			className={["np-popup", className].filter(Boolean).join(" ")}
			data-np-popup={content.slug}
			data-close-on-backdrop={content.closeOnBackdrop ? "true" : "false"}
			aria-label={content.name}
			{...attributes}
		>
			<div className="np-popup__panel" style={panelStyle}>
				{content.closeButton ? (
					<button type="button" className="np-popup__close" data-np-popup-close="" aria-label="Close">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>
				) : null}
				{children}
			</div>
		</dialog>
	);
}

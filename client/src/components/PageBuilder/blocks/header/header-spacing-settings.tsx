import type { JSX } from "react";
import {
	DEFAULT_HEADER_CONTENT_WIDTH,
	DEFAULT_HEADER_PADDING_BLOCK,
	DEFAULT_HEADER_PADDING_INLINE,
	HEADER_CONTENT_WIDTH_PRESETS,
	HEADER_SIDE_PADDING_PRESETS,
	HEADER_TOP_BOTTOM_PADDING_PRESETS,
	type HeaderSpacing,
} from "@shared/header-spacing";
import { DimensionPresetField } from "../../dimension-preset-field";

type HeaderSpacingSettingsProps = {
	value: HeaderSpacing;
	/** `undefined` for a field puts its default back. */
	onChange: (patch: HeaderSpacing) => void;
};

/** Header padding and how wide its row of logo, links and buttons may get. */
export function HeaderSpacingSettings({ value, onChange }: HeaderSpacingSettingsProps): JSX.Element {
	return (
		<div className="space-y-4">
			<DimensionPresetField
				label="Content width"
				presets={HEADER_CONTENT_WIDTH_PRESETS}
				value={value.contentWidth ?? DEFAULT_HEADER_CONTENT_WIDTH}
				defaultValue={DEFAULT_HEADER_CONTENT_WIDTH}
				customPlaceholder="e.g. 1240px"
				onChange={(next) => onChange({ contentWidth: next })}
			/>
			<p className="npb-settings-hint-muted -mt-2 text-xs">
				The background stays edge to edge. The logo, links and buttons sit within this width, centred.
			</p>
			<DimensionPresetField
				label="Side padding"
				presets={HEADER_SIDE_PADDING_PRESETS}
				value={value.paddingInline ?? DEFAULT_HEADER_PADDING_INLINE}
				defaultValue={DEFAULT_HEADER_PADDING_INLINE}
				customPlaceholder="e.g. 1.5rem"
				onChange={(next) => onChange({ paddingInline: next })}
			/>
			<DimensionPresetField
				label="Top and bottom padding"
				presets={HEADER_TOP_BOTTOM_PADDING_PRESETS}
				value={value.paddingBlock ?? DEFAULT_HEADER_PADDING_BLOCK}
				defaultValue={DEFAULT_HEADER_PADDING_BLOCK}
				customPlaceholder="e.g. 1rem"
				onChange={(next) => onChange({ paddingBlock: next })}
			/>
		</div>
	);
}

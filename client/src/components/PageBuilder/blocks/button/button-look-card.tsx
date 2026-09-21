import { MousePointer } from "lucide-react";
import type { TokenEntry } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { BORDER_RADIUS_PRESETS } from "@shared/dimension-presets";
import {
	BUTTON_SIZE_PRESETS,
	buildButtonLookChange,
	buildButtonThemeChange,
	buttonFollowsTheme,
	buttonSizeStyles,
	customButtonSizeStyles,
	readButtonLook,
	readButtonSize,
	type ButtonColorProperty,
	type ButtonLook,
	type ButtonLookChange,
	type ButtonSize,
} from "@shared/button-look";
import ColorField from "../../ColorField";
import { DimensionPresetField } from "../../dimension-preset-field";
import { SettingsChipGroup } from "../../settings-chip-group";
import { SettingsLabel } from "../../shared";
import { UnitValueField } from "../../unit-value-field";

type TokenBag = Record<string, TokenEntry | null | undefined> | undefined;

type ButtonLookCardProps = {
	/** The button's current styles (block styles merged with live edits). */
	styles: Record<string, unknown>;
	tokenMap: TokenBag;
	/** Sets style keys; `undefined` clears one. */
	onStyles: (patch: Record<string, string | undefined>) => void;
	/** Sets colour tokens; `null` removes one. */
	onTokens: (tokens: ButtonLookChange["tokens"]) => void;
	onAccent: (entry: TokenEntry) => void;
};

const text = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() !== "" ? value : undefined;

/**
 * The same four controls the header's buttons have — Look, Size, Corners, Color — for a button
 * block. Choices are saved as ordinary styles, so nothing about how the button publishes changes.
 */
export function ButtonLookCard({ styles, tokenMap, onStyles, onTokens, onAccent }: ButtonLookCardProps) {
	const look = readButtonLook({ styles, tokenMap });
	const size = readButtonSize(styles);
	const accentProperty = look === "solid" ? "backgroundColor" : "color";

	const followTheme = (property: ButtonColorProperty) => {
		const change = buildButtonThemeChange({ property, look });
		onStyles(change.styles);
		onTokens(change.tokens);
	};

	const themeState = (property: ButtonColorProperty) =>
		buttonFollowsTheme({ property, look, styles, tokenMap });

	const pickLook = (next: ButtonLook) => {
		if (next === look) return;
		const change = buildButtonLookChange({ look: next, styles, tokenMap });
		onStyles(change.styles);
		onTokens(change.tokens);
	};

	return (
		<CollapsibleCard title="Button look" icon={MousePointer} defaultOpen>
			<SettingsChipGroup
				label="Look"
				ariaLabel="Button look"
				options={[
					{ value: "solid", label: "Solid", accessibleName: "Solid button" },
					{ value: "ghost", label: "Ghost", accessibleName: "Ghost button" },
				]}
				value={look}
				onChange={(value) => pickLook(value === "ghost" ? "ghost" : "solid")}
			/>

			<div>
				<SettingsChipGroup
					label="Size"
					options={BUTTON_SIZE_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
					value={size === "custom" ? "" : size}
					onChange={(value) => onStyles(buttonSizeStyles(value as ButtonSize))}
				/>
				<UnitValueField
					className="mt-2"
					ariaLabel="Button text size"
					value={text(styles.fontSize)}
					onChange={(next) => {
						if (next !== undefined) onStyles(customButtonSizeStyles(next));
					}}
					active={size === "custom"}
					placeholder="Text size"
				/>
			</div>

			<DimensionPresetField
				label="Corners"
				presets={BORDER_RADIUS_PRESETS}
				value={text(styles.borderRadius)}
				onChange={(next) => onStyles({ borderRadius: next })}
				customPlaceholder="e.g. 8"
			/>

			<div className="space-y-2">
				<SettingsLabel>Colors</SettingsLabel>
				<ColorField
					ariaLabel="Button color"
					defaultProperty={accentProperty}
					targets={[
						{
							property: "backgroundColor",
							label: "Background",
							entry: tokenMap?.backgroundColor,
							styleValue: text(styles.backgroundColor),
							followsTheme: themeState("backgroundColor"),
						},
						{
							property: "color",
							label: "Text",
							entry: tokenMap?.color,
							styleValue: text(styles.color),
							followsTheme: themeState("color"),
						},
					]}
					onChange={onAccent}
					onTheme={(target) => followTheme(target.property === "color" ? "color" : "backgroundColor")}
				/>
			</div>
		</CollapsibleCard>
	);
}

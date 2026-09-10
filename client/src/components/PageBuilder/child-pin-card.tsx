import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Layout } from "lucide-react";
import { AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Circle } from "lucide-react";
import { SettingsChipGroup } from "./settings-chip-group";

export type ChildPinStylePatch = {
	contentAlignHorizontal?: "left" | "center" | "right" | null;
	contentAlignVertical?: "top" | "middle" | "bottom" | null;
};

type ChildPinCardProps = {
	horizontal: string;
	vertical: string;
	onChange: (patch: ChildPinStylePatch) => void;
};

/**
 * Sibling pin inside a flex/grid parent — stack language, not CSS property names.
 */
export function ChildPinCard({ horizontal, vertical, onChange }: ChildPinCardProps) {
	return (
		<CollapsibleCard title="Pin in parent" icon={Layout} defaultOpen={true}>
			<p className="npb-settings-hint mb-3 text-xs">
				Where this block sits among siblings. Vertical middle/bottom shows when the parent has extra space.
			</p>
			<SettingsChipGroup
				label="Horizontal"
				ariaLabel="Horizontal"
				icon={AlignLeft}
				options={[
					{ value: "__unset", label: "Default", icon: Circle },
					{ value: "left", label: "Left", icon: AlignLeft },
					{ value: "center", label: "Center", icon: AlignCenter },
					{ value: "right", label: "Right", icon: AlignRight },
				]}
				value={horizontal}
				onChange={(v) =>
					onChange({
						contentAlignHorizontal:
							v === "__unset" ? null : (v as "left" | "center" | "right"),
					})
				}
			/>
			<SettingsChipGroup
				label="Vertical"
				ariaLabel="Vertical"
				icon={AlignCenter}
				className="mt-4"
				options={[
					{ value: "__unset", label: "Default", icon: Circle },
					{ value: "top", label: "Top", icon: ChevronUp },
					{ value: "middle", label: "Middle", icon: AlignCenter },
					{ value: "bottom", label: "Bottom", icon: ChevronDown },
				]}
				value={vertical}
				onChange={(v) =>
					onChange({
						contentAlignVertical: v === "__unset" ? null : (v as "top" | "middle" | "bottom"),
					})
				}
			/>
		</CollapsibleCard>
	);
}

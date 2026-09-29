import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { Copy, MessageSquareShare, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { useToast } from "@/hooks/use-toast";
import {
	popupHref,
	readPopupContent,
	slugifyPopupName,
	type PopupContent,
} from "@shared/popup-model";
import { BORDER_RADIUS_PRESETS, SPACING_PRESETS } from "@shared/dimension-presets";
import { SettingsLabel } from "../../shared";
import { SettingsChipGroup } from "../../settings-chip-group";
import { DimensionPresetField } from "../../dimension-preset-field";
import ColorField from "../../ColorField";
import { usePagePopups } from "../../popup-links";
import { useSettingsState } from "../useSettingsState";

const SIZE_OPTIONS = [
	{ value: "sm", label: "SM" },
	{ value: "md", label: "MD" },
	{ value: "lg", label: "LG" },
	{ value: "full", label: "Wide" },
];
const ANIMATION_OPTIONS = [
	{ value: "scale", label: "Zoom" },
	{ value: "fade", label: "Fade" },
	{ value: "slide-up", label: "Slide up" },
];

type PopupSettingsProps = {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
};

function SwitchRow({
	id,
	label,
	hint,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<div className="min-w-0">
				<SettingsLabel htmlFor={id}>{label}</SettingsLabel>
				{hint ? <p className="npb-settings-hint-muted text-xs">{hint}</p> : null}
			</div>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</div>
	);
}

/** Popup settings: its name and link, how it behaves, and how the card and backdrop look. */
export function PopupSettings({ block, onUpdate }: PopupSettingsProps) {
	const { content, updateContent } = useSettingsState<PopupContent>({
		block,
		onUpdate,
		parseContent: readPopupContent,
	});
	const { popups, linkCounts } = usePagePopups();
	const { toast } = useToast();
	const clash = popups.some((popup) => popup.id !== block.id && popup.slug === content.slug);
	const links = linkCounts[content.slug] ?? 0;

	const rename = (name: string) => {
		// The link keeps following the name until someone sets it by hand.
		const following = content.slug === slugifyPopupName(content.name);
		updateContent(following ? { name, slug: slugifyPopupName(name) } : { name });
	};

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(popupHref(content.slug));
			toast({ title: "Link copied", description: `Use ${popupHref(content.slug)} on any button or link.` });
		} catch (error) {
			console.error("[popup-settings] Copy failed", { blockId: block.id, error });
			toast({ title: "Couldn't copy", description: "Select the link text and copy it by hand." });
		}
	};

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Popup" icon={MessageSquareShare} defaultOpen>
				<div className="space-y-4">
					<div className="space-y-2">
						<SettingsLabel htmlFor={`popup-name-${block.id}`}>Name</SettingsLabel>
						<Input
							id={`popup-name-${block.id}`}
							value={content.name}
							onChange={(event) => rename(event.target.value)}
							placeholder="Get updates"
						/>
					</div>
					<div className="space-y-2">
						<SettingsLabel htmlFor={`popup-slug-${block.id}`}>Link</SettingsLabel>
						<div className="flex items-center gap-2">
							<span className="text-sm text-npb-text-muted">#popup-</span>
							<Input
								id={`popup-slug-${block.id}`}
								value={content.slug}
								aria-invalid={clash}
								onChange={(event) => updateContent({ slug: slugifyPopupName(event.target.value) })}
								className="h-9 min-w-0 flex-1"
							/>
							<Button type="button" variant="outline" size="sm" onClick={() => void copyLink()} aria-label="Copy link">
								<Copy className="h-3.5 w-3.5" aria-hidden />
							</Button>
						</div>
						{clash ? (
							<p className="text-xs text-npb-status-error">
								Another popup on this page uses this link. Change one so each opens the right popup.
							</p>
						) : (
							<p className="npb-settings-hint-muted text-xs">
								{links > 0
									? `${links} ${links === 1 ? "link opens" : "links open"} this popup. Changing the link here does not update them.`
									: "Pick this popup under any button's link, or paste the link. It also opens when a page address ends with it."}
							</p>
						)}
					</div>
					<SettingsChipGroup
						label="Width"
						options={SIZE_OPTIONS}
						value={content.size}
						onChange={(value) => updateContent({ size: value as PopupContent["size"] })}
					/>
					<SwitchRow
						id={`popup-close-${block.id}`}
						label="Close button"
						checked={content.closeButton}
						onChange={(checked) => updateContent({ closeButton: checked })}
					/>
					<SwitchRow
						id={`popup-backdrop-close-${block.id}`}
						label="Close when clicking outside"
						hint="Esc always closes it."
						checked={content.closeOnBackdrop}
						onChange={(checked) => updateContent({ closeOnBackdrop: checked })}
					/>
					<SwitchRow
						id={`popup-bottom-${block.id}`}
						label="Slide up from the bottom on phones"
						checked={content.bottomOnPhones}
						onChange={(checked) => updateContent({ bottomOnPhones: checked })}
					/>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Look" icon={Palette} defaultOpen={false}>
				<div className="space-y-4">
					<div className="space-y-2">
						<SettingsLabel>Colors</SettingsLabel>
						<ColorField
							ariaLabel="Popup colors"
							targets={[
								{ property: "background", label: "Card", styleValue: content.background },
								{ property: "backdropColor", label: "Backdrop", styleValue: content.backdropColor },
							]}
							onChange={(entry: TokenEntry) => updateContent({ [entry.property]: entry.style } as Partial<PopupContent>)}
							onTheme={(target) => updateContent({ [target.property]: undefined } as Partial<PopupContent>)}
						/>
					</div>
					<div className="space-y-2">
						<SettingsLabel htmlFor={`popup-blur-${block.id}`}>Backdrop blur: {content.backdropBlur}px</SettingsLabel>
						<Slider
							id={`popup-blur-${block.id}`}
							min={0}
							max={24}
							step={1}
							value={[content.backdropBlur]}
							onValueChange={([blur]) => updateContent({ backdropBlur: blur ?? 0 })}
						/>
					</div>
					<DimensionPresetField
						label="Corners"
						presets={BORDER_RADIUS_PRESETS}
						value={content.radius}
						onChange={(next) => updateContent({ radius: next || "12px" })}
					/>
					<DimensionPresetField
						label="Inner padding"
						presets={SPACING_PRESETS}
						value={content.padding}
						onChange={(next) => updateContent({ padding: next || "24px" })}
					/>
					<SettingsChipGroup
						label="Opening"
						options={ANIMATION_OPTIONS}
						value={content.animation}
						onChange={(value) => updateContent({ animation: value as PopupContent["animation"] })}
					/>
				</div>
			</CollapsibleCard>
		</div>
	);
}

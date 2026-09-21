import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsChipGroup } from "../../settings-chip-group";
import { DimensionPresetField } from "../../dimension-preset-field";
import { SettingsDisclosure, SettingsLabel } from "../../shared";
import { MediaUrlField } from "../shared/media-url-field";
import ColorField from "../../ColorField";
import {
	applyHeaderBrandKind,
	applyHeaderVariant,
	createHeaderAction,
	createHeaderNavChild,
	createHeaderNavItem,
	DEFAULT_HEADER_ACTION_RADIUS,
	DEFAULT_HEADER_ACTION_SIZE,
	DEFAULT_HEADER_CONTENT,
	DEFAULT_HEADER_LOGO_RADIUS,
	DEFAULT_HEADER_LOGO_SIZE,
	headerHasBlocksSlot,
	HEADER_ACTION_RADIUS_PRESETS,
	HEADER_ACTION_SIZE_PRESETS,
	HEADER_LOGO_RADIUS_PRESETS,
	HEADER_LOGO_SIZE_PRESETS,
	HEADER_PLACEHOLDERS,
	nextHeaderActionStyle,
	normalizeHeaderContent,
	readHeaderContent,
	slotsForHeaderVariant,
	type HeaderAction,
	type HeaderContent,
	type HeaderNavChild,
	type HeaderNavItem,
	type HeaderVariant,
} from "@shared/header-model";
import { HeaderVariantPicker } from "./header-variant-picker";

const nextId = (prefix: string): string =>
	`${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function HeaderField({
	id,
	label,
	value,
	placeholder,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<SettingsLabel htmlFor={id}>{label}</SettingsLabel>
			<Input
				id={id}
				value={value}
				placeholder={placeholder}
				className="h-9"
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

function RemoveRow({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-9 w-9 shrink-0 p-0"
			aria-label={label}
			onClick={onClick}
		>
			<Trash2 className="h-3.5 w-3.5" />
		</Button>
	);
}

export function HeaderSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	const { content: rawContent, updateContent } = useSettingsState<HeaderContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_HEADER_CONTENT,
		parseContent: readHeaderContent,
	});
	const content = normalizeHeaderContent(rawContent);
	// Show only the groups the chosen layout actually paints.
	const shows = slotsForHeaderVariant(content.variant);

	const pickLayout = (variant: HeaderVariant) => {
		updateContent(applyHeaderVariant(content, variant));
		// Only containers may hold child blocks. Set after the content write so it is the last one.
		if (headerHasBlocksSlot(variant) && block.type !== "container") onUpdate?.({ type: "container" });
	};

	const updateNav = (index: number, patch: Partial<HeaderNavItem>) => {
		updateContent({
			nav: content.nav.map((item, itemIndex) =>
				itemIndex === index ? { ...item, ...patch } : item,
			),
		});
	};

	const updateAction = (index: number, patch: Partial<HeaderAction>) => {
		updateContent({
			actions: content.actions.map((item, itemIndex) =>
				itemIndex === index ? { ...item, ...patch } : item,
			),
		});
	};

	const updateChild = (
		index: number,
		childIndex: number,
		patch: Partial<HeaderNavChild>,
	) => {
		const children = (content.nav[index]?.children ?? []).map((row, rowIndex) =>
			rowIndex === childIndex ? { ...row, ...patch } : row,
		);
		updateNav(index, { children });
	};

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Layout" defaultOpen={true}>
				<HeaderVariantPicker
					value={content.variant}
					onChange={(value) => pickLayout(value as HeaderVariant)}
				/>
				{headerHasBlocksSlot(content.variant) ? (
					<p className="npb-settings-hint-muted mt-3 text-xs">
						Drop any block on the header's right side, on the canvas.
					</p>
				) : null}
				<div className="mt-3 flex items-center justify-between gap-3">
					<SettingsLabel htmlFor="header-sticky">Float on scroll</SettingsLabel>
					<Switch
						id="header-sticky"
						checked={content.sticky}
						onCheckedChange={(checked) => updateContent({ sticky: checked })}
					/>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Brand" defaultOpen={true}>
				<SettingsChipGroup
					label="Kind"
					ariaLabel="Brand kind"
					options={[
						{ value: "wordmark", label: "Wordmark", accessibleName: "Wordmark" },
						{ value: "logo", label: "Logo", accessibleName: "Logo" },
					]}
					value={content.brand.kind}
					onChange={(value) =>
						updateContent({
							brand: applyHeaderBrandKind(
								content.brand,
								value === "logo" ? "logo" : "wordmark",
							),
						})
					}
				/>
				<div className="mt-3">
					<HeaderField
						id="header-brand-text"
						label="Name"
						value={content.brand.text}
						placeholder={HEADER_PLACEHOLDERS.brandName}
						onChange={(text) => updateContent({ brand: { ...content.brand, text } })}
					/>
				</div>
				{content.brand.kind === "logo" ? (
					<div className="mt-3 space-y-3">
						<MediaUrlField
							id="header-logo-url"
							label="Logo"
							kind="image"
							value={content.brand.logoUrl ?? ""}
							placeholder={HEADER_PLACEHOLDERS.logoUrl}
							onChange={({ url }) =>
								updateContent({ brand: { ...content.brand, logoUrl: url } })
							}
							onLibrarySelect={({ item }) =>
								updateContent({ brand: { ...content.brand, logoUrl: item.url } })
							}
						/>
						<div className="flex items-center justify-between gap-3">
							<SettingsLabel htmlFor="header-logo-show-name">Show name</SettingsLabel>
							<Switch
								id="header-logo-show-name"
								checked={content.brand.showName}
								onCheckedChange={(showName) =>
									updateContent({ brand: { ...content.brand, showName } })
								}
							/>
						</div>
						<SettingsDisclosure title="Logo look">
							<DimensionPresetField
								label="Size"
								presets={HEADER_LOGO_SIZE_PRESETS}
								value={content.brand.logoSize}
								defaultValue={DEFAULT_HEADER_LOGO_SIZE}
								customPlaceholder="e.g. 3rem or 48px"
								onChange={(next) =>
									updateContent({
										brand: { ...content.brand, logoSize: next ?? DEFAULT_HEADER_LOGO_SIZE },
									})
								}
							/>
							<DimensionPresetField
								label="Corners"
								presets={HEADER_LOGO_RADIUS_PRESETS}
								value={content.brand.logoRadius}
								defaultValue={DEFAULT_HEADER_LOGO_RADIUS}
								customPlaceholder="e.g. 8px"
								onChange={(next) =>
									updateContent({
										brand: { ...content.brand, logoRadius: next ?? DEFAULT_HEADER_LOGO_RADIUS },
									})
								}
							/>
						</SettingsDisclosure>
					</div>
				) : null}
				<div className="mt-3">
					<HeaderField
						id="header-brand-link"
						label="Link"
						value={content.brand.href ?? ""}
						placeholder={HEADER_PLACEHOLDERS.brandHref}
						onChange={(href) => updateContent({ brand: { ...content.brand, href } })}
					/>
				</div>
			</CollapsibleCard>

			{shows.showNav ? (
			<CollapsibleCard title="Links" defaultOpen={false}>
				<div className="divide-y divide-npb-divider">
					{content.nav.map((item, index) => {
						const isMenu = (item.children?.length ?? 0) > 0;
						return (
							<div key={item.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
								<HeaderField
									id={`${item.id}-label`}
									label="Label"
									value={item.label}
									placeholder={HEADER_PLACEHOLDERS.linkLabel}
									onChange={(label) => updateNav(index, { label })}
								/>
								<HeaderField
									id={`${item.id}-url`}
									label="URL"
									value={item.href}
									placeholder={HEADER_PLACEHOLDERS.linkHref}
									onChange={(href) => updateNav(index, { href })}
								/>
								<div className="flex items-center justify-between gap-2">
									<SettingsChipGroup
										className="min-w-0 flex-1"
										label=""
										ariaLabel="Link kind"
										options={[
											{ value: "link", label: "Link", accessibleName: "Single link" },
											{ value: "menu", label: "Menu", accessibleName: "Dropdown menu" },
										]}
										value={isMenu ? "menu" : "link"}
										onChange={(value) =>
											updateNav(index, {
												children:
													value === "menu"
														? [createHeaderNavChild(nextId("nav-child"))]
														: undefined,
											})
										}
									/>
									<RemoveRow
										label="Remove link"
										onClick={() =>
											updateContent({
												nav: content.nav.filter((_, itemIndex) => itemIndex !== index),
											})
										}
									/>
								</div>
								{isMenu ? (
									<div className="space-y-3 border-l border-npb-border-default pl-3">
										{item.children?.map((child, childIndex) => (
											<div key={child.id} className="space-y-3">
												<HeaderField
													id={`${child.id}-label`}
													label="Item"
													value={child.label}
													placeholder={HEADER_PLACEHOLDERS.menuItemLabel}
													onChange={(label) => updateChild(index, childIndex, { label })}
												/>
												<div className="flex items-end gap-2">
													<div className="min-w-0 flex-1">
														<HeaderField
															id={`${child.id}-url`}
															label="URL"
															value={child.href}
															placeholder={HEADER_PLACEHOLDERS.menuItemHref}
															onChange={(href) => updateChild(index, childIndex, { href })}
														/>
													</div>
													<RemoveRow
														label="Remove dropdown item"
														onClick={() => {
															const children = (item.children ?? []).filter(
																(_, rowIndex) => rowIndex !== childIndex,
															);
															updateNav(index, {
																children: children.length > 0 ? children : undefined,
															});
														}}
													/>
												</div>
											</div>
										))}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-9 rounded-none px-2"
											onClick={() =>
												updateNav(index, {
													children: [
														...(item.children ?? []),
														createHeaderNavChild(nextId("nav-child")),
													],
												})
											}
										>
											<Plus className="mr-1 h-3.5 w-3.5" />
											Add item
										</Button>
									</div>
								) : null}
							</div>
						);
					})}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3 h-9 w-full rounded-none"
					onClick={() =>
						updateContent({
							nav: [...content.nav, createHeaderNavItem(nextId("nav"))],
						})
					}
				>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Add link
				</Button>
			</CollapsibleCard>
			) : null}

			{shows.showActions ? (
			<CollapsibleCard title="Buttons" defaultOpen={false}>
				<div className="divide-y divide-npb-divider">
					{content.actions.map((item, index) => (
						<div key={item.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
							<HeaderField
								id={`${item.id}-label`}
								label="Label"
								value={item.label}
								placeholder={HEADER_PLACEHOLDERS.buttonLabel}
								onChange={(label) => updateAction(index, { label })}
							/>
							<HeaderField
								id={`${item.id}-url`}
								label="URL"
								value={item.href}
								placeholder={HEADER_PLACEHOLDERS.buttonHref}
								onChange={(href) => updateAction(index, { href })}
							/>
							<div className="space-y-3">
								<SettingsDisclosure title="Button style">
									<SettingsChipGroup
										label="Look"
										ariaLabel="Button look"
										options={[
											{ value: "ghost", label: "Ghost", accessibleName: "Ghost button" },
											{ value: "solid", label: "Solid", accessibleName: "Solid button" },
										]}
										value={item.style}
										onChange={(value) =>
											updateAction(index, { style: value === "ghost" ? "ghost" : "solid" })
										}
									/>
									<DimensionPresetField
										label="Size"
										presets={HEADER_ACTION_SIZE_PRESETS}
										value={item.size}
										defaultValue={DEFAULT_HEADER_ACTION_SIZE}
										customPlaceholder="Text size, e.g. 0.95rem"
										onChange={(next) =>
											updateAction(index, { size: next ?? DEFAULT_HEADER_ACTION_SIZE })
										}
									/>
									<DimensionPresetField
										label="Corners"
										presets={HEADER_ACTION_RADIUS_PRESETS}
										value={item.radius}
										defaultValue={DEFAULT_HEADER_ACTION_RADIUS}
										customPlaceholder="e.g. 8px"
										onChange={(next) =>
											updateAction(index, { radius: next ?? DEFAULT_HEADER_ACTION_RADIUS })
										}
									/>
									<div className="space-y-2">
										<SettingsLabel>Color</SettingsLabel>
										<ColorField
											ariaLabel="Button color"
											defaultProperty="backgroundColor"
											targets={[
												{
													property: "backgroundColor",
													label: item.style === "solid" ? "Background" : "Outline",
													entry: item.color,
													styleValue: item.color?.style,
												},
												{
													property: "color",
													label: "Text",
													entry: item.textColor,
													styleValue: item.textColor?.style,
												},
											]}
											onChange={(entry: TokenEntry) =>
												updateAction(index, entry.property === "color" ? { textColor: entry } : { color: entry })
											}
											onTheme={(target) =>
												updateAction(index, target.property === "color" ? { textColor: undefined } : { color: undefined })
											}
										/>
									</div>
								</SettingsDisclosure>
								<RemoveRow
									label="Remove button"
									onClick={() =>
										updateContent({
											actions: content.actions.filter((_, itemIndex) => itemIndex !== index),
										})
									}
								/>
							</div>
						</div>
					))}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3 h-9 w-full rounded-none"
					onClick={() =>
						updateContent({
							actions: [
								...content.actions,
								createHeaderAction(
									nextId("action"),
									nextHeaderActionStyle(content.actions),
								),
							],
						})
					}
				>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Add button
				</Button>
			</CollapsibleCard>
			) : null}
		</div>
	);
}

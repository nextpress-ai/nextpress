import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsChipGroup } from "../../settings-chip-group";
import { SettingsLabel } from "../../shared";
import { MediaUrlField } from "../shared/media-url-field";
import TokenColorPicker from "../../TokenColorPicker";
import {
	applyHeaderBrandKind,
	applyHeaderVariant,
	createHeaderAction,
	createHeaderNavChild,
	createHeaderNavItem,
	DEFAULT_HEADER_CONTENT,
	HEADER_ACTION_RADIUS_PRESETS,
	HEADER_ACTION_SIZE_PRESETS,
	HEADER_LOGO_RADIUS_PRESETS,
	HEADER_LOGO_SIZE_PRESETS,
	HEADER_PLACEHOLDERS,
	nextHeaderActionStyle,
	normalizeHeaderContent,
	readHeaderContent,
	type HeaderAction,
	type HeaderActionSize,
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
					onChange={(value) =>
						updateContent(applyHeaderVariant(content, value as HeaderVariant))
					}
				/>
				<div className="mt-3 flex items-center justify-between gap-3">
					<SettingsLabel htmlFor="header-sticky">Stay on scroll</SettingsLabel>
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
						<SettingsChipGroup
							label="Size"
							ariaLabel="Logo size"
							options={HEADER_LOGO_SIZE_PRESETS.map((option) => ({
								value: option.value,
								label: option.label,
								accessibleName: option.label,
							}))}
							value={content.brand.logoSize}
							onChange={(logoSize) =>
								updateContent({ brand: { ...content.brand, logoSize } })
							}
						/>
						<SettingsChipGroup
							label="Corners"
							ariaLabel="Logo corners"
							options={HEADER_LOGO_RADIUS_PRESETS.map((option) => ({
								value: option.value,
								label: option.label,
								accessibleName: option.label,
							}))}
							value={content.brand.logoRadius}
							onChange={(logoRadius) =>
								updateContent({ brand: { ...content.brand, logoRadius } })
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

			<CollapsibleCard title="Links" defaultOpen={true}>
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

			<CollapsibleCard title="Buttons" defaultOpen={true}>
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
								<SettingsChipGroup
									label="Size"
									ariaLabel="Button size"
									options={HEADER_ACTION_SIZE_PRESETS.map((option) => ({
										value: option.value,
										label: option.label,
										accessibleName: option.label,
									}))}
									value={item.size}
									onChange={(size) =>
										updateAction(index, { size: size as HeaderActionSize })
									}
								/>
								<SettingsChipGroup
									label="Corners"
									ariaLabel="Button corners"
									options={HEADER_ACTION_RADIUS_PRESETS.map((option) => ({
										value: option.value,
										label: option.label,
										accessibleName: option.label,
									}))}
									value={item.radius}
									onChange={(radius) => updateAction(index, { radius })}
								/>
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<SettingsLabel>Color</SettingsLabel>
										{item.color ? (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-8 px-2"
												onClick={() => updateAction(index, { color: undefined })}
											>
												Theme
											</Button>
										) : null}
									</div>
									<TokenColorPicker
										property="backgroundColor"
										currentEntry={item.color}
										currentStyleValue={item.color?.style}
										onChange={(entry: TokenEntry) =>
											updateAction(index, { color: entry })
										}
									/>
								</div>
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
		</div>
	);
}

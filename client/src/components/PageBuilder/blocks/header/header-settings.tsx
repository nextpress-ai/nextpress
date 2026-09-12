import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsChipGroup } from "../../settings-chip-group";
import { MediaUrlField } from "../shared/media-url-field";
import { cn } from "@/lib/utils";
import {
	applyHeaderVariant,
	DEFAULT_HEADER_CONTENT,
	readHeaderContent,
	type HeaderAction,
	type HeaderContent,
	type HeaderNavItem,
	type HeaderVariant,
} from "@shared/header-model";
import { HeaderVariantPicker } from "./header-variant-picker";

const nextId = (prefix: string): string =>
	`${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function RowRemove({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-8 w-8 shrink-0 p-0"
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
	const { content, updateContent } = useSettingsState<HeaderContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_HEADER_CONTENT,
		parseContent: readHeaderContent,
	});

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
					<Label htmlFor="header-sticky">Stay on scroll</Label>
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
							brand: { ...content.brand, kind: value === "logo" ? "logo" : "wordmark" },
						})
					}
				/>
				<div className="mt-3 space-y-2">
					<Label htmlFor="header-brand-text">Name</Label>
					<Input
						id="header-brand-text"
						value={content.brand.text}
						onChange={(event) =>
							updateContent({ brand: { ...content.brand, text: event.target.value } })
						}
					/>
				</div>
				{content.brand.kind === "logo" ? (
					<div className="mt-3">
						<MediaUrlField
							id="header-logo-url"
							label="Logo"
							kind="image"
							value={content.brand.logoUrl ?? ""}
							onChange={({ url }) =>
								updateContent({ brand: { ...content.brand, logoUrl: url } })
							}
							onLibrarySelect={({ item }) =>
								updateContent({ brand: { ...content.brand, logoUrl: item.url } })
							}
						/>
					</div>
				) : null}
				<div className="mt-3 space-y-2">
					<Label htmlFor="header-brand-link">Link</Label>
					<Input
						id="header-brand-link"
						value={content.brand.href ?? ""}
						placeholder="/"
						onChange={(event) =>
							updateContent({ brand: { ...content.brand, href: event.target.value } })
						}
					/>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Links" defaultOpen={true}>
				<div className="space-y-2">
					{content.nav.map((item, index) => {
						const isMenu = (item.children?.length ?? 0) > 0;
						return (
							<div key={item.id} className="space-y-1.5">
								<div className="flex items-center gap-1.5">
									<Input
										value={item.label}
										placeholder="Label"
										aria-label="Link label"
										className="h-8"
										onChange={(event) => updateNav(index, { label: event.target.value })}
									/>
									<Input
										value={item.href}
										placeholder="/"
										aria-label="Link URL"
										className="h-8"
										onChange={(event) => updateNav(index, { href: event.target.value })}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 w-8 shrink-0 p-0"
										aria-label={isMenu ? "Turn off dropdown" : "Make dropdown"}
										aria-pressed={isMenu}
										onClick={() =>
											updateNav(index, {
												children: isMenu
													? undefined
													: [{ id: nextId("nav-child"), label: "Overview", href: "#" }],
											})
										}
									>
										<ChevronDown className="h-3.5 w-3.5" />
									</Button>
									<RowRemove
										label="Remove link"
										onClick={() =>
											updateContent({
												nav: content.nav.filter((_, itemIndex) => itemIndex !== index),
											})
										}
									/>
								</div>
								{isMenu
									? item.children?.map((child, childIndex) => (
											<div key={child.id} className="flex items-center gap-1.5 pl-4">
												<Input
													value={child.label}
													placeholder="Item"
													aria-label="Dropdown label"
													className="h-8"
													onChange={(event) => {
														const children = (item.children ?? []).map((row, rowIndex) =>
															rowIndex === childIndex
																? { ...row, label: event.target.value }
																: row,
														);
														updateNav(index, { children });
													}}
												/>
												<Input
													value={child.href}
													placeholder="/"
													aria-label="Dropdown URL"
													className="h-8"
													onChange={(event) => {
														const children = (item.children ?? []).map((row, rowIndex) =>
															rowIndex === childIndex ? { ...row, href: event.target.value } : row,
														);
														updateNav(index, { children });
													}}
												/>
												<RowRemove
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
										))
									: null}
								{isMenu ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="ml-4 h-7 rounded-none px-2 text-xs"
										onClick={() =>
											updateNav(index, {
												children: [
													...(item.children ?? []),
													{ id: nextId("nav-child"), label: "Item", href: "#" },
												],
											})
										}
									>
										<Plus className="mr-1 h-3 w-3" />
										Add item
									</Button>
								) : null}
							</div>
						);
					})}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="rounded-none"
						onClick={() =>
							updateContent({
								nav: [...content.nav, { id: nextId("nav"), label: "Link", href: "#" }],
							})
						}
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Add link
					</Button>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title="Buttons" defaultOpen={true}>
				<div className="space-y-2">
					{content.actions.map((item, index) => (
						<div key={item.id} className="flex items-center gap-1.5">
							<Input
								value={item.label}
								placeholder="Label"
								aria-label="Button label"
								className="h-8"
								onChange={(event) => updateAction(index, { label: event.target.value })}
							/>
							<Input
								value={item.href}
								placeholder="/"
								aria-label="Button URL"
								className="h-8"
								onChange={(event) => updateAction(index, { href: event.target.value })}
							/>
							<div className="grid shrink-0 grid-cols-2 gap-0.5">
								{(["ghost", "solid"] as const).map((style) => (
									<button
										key={style}
										type="button"
										aria-pressed={item.style === style}
										className={cn(
											"h-8 px-2 text-[11px] font-medium",
											item.style === style
												? "bg-npb-interactive-bg-active text-npb-interactive-text-active"
												: "border border-npb-border-default text-npb-text-secondary hover:bg-npb-interactive-bg-hover",
										)}
										onClick={() => updateAction(index, { style })}
									>
										{style === "ghost" ? "Ghost" : "Solid"}
									</button>
								))}
							</div>
							<RowRemove
								label="Remove button"
								onClick={() =>
									updateContent({
										actions: content.actions.filter((_, itemIndex) => itemIndex !== index),
									})
								}
							/>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="rounded-none"
						onClick={() =>
							updateContent({
								actions: [
									...content.actions,
									{ id: nextId("action"), label: "Button", href: "#", style: "ghost" },
								],
							})
						}
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Add button
					</Button>
				</div>
			</CollapsibleCard>
		</div>
	);
}

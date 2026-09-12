import React from "react";
import type { BlockConfig, TokenEntry } from "@shared/schema-types";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Layout } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { SettingsChipGroup } from "../../settings-chip-group";
import TokenColorPicker from "../../TokenColorPicker";
import { PAGE_FONT_CATALOG } from "@shared/font-catalog";
import {
	DEFAULT_PAGE_SHELL_CONTENT,
	PAGE_SHELL_WIDTH_OPTIONS,
	readPageShellContent,
	type PageShellContent,
} from "./page-shell-model";

export function PageShellSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	const { content, updateContent } = useSettingsState<PageShellContent>({
		block,
		onUpdate,
		defaultContent: DEFAULT_PAGE_SHELL_CONTENT,
		parseContent: readPageShellContent,
	});

	return (
		<div className="space-y-4">
			<CollapsibleCard title="Page design" icon={Layout} defaultOpen={true}>
				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="page-shell-font">Font</Label>
						<Select
							value={content.fontFamily}
							onValueChange={(value) => updateContent({ fontFamily: value })}
						>
							<SelectTrigger id="page-shell-font">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_FONT_CATALOG.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<SettingsChipGroup
						label="Content width"
						ariaLabel="Content width"
						options={PAGE_SHELL_WIDTH_OPTIONS.map((option) => ({
							value: option.value,
							label: option.label,
							accessibleName: option.label,
						}))}
						value={content.containerWidth}
						onChange={(value) => updateContent({ containerWidth: value })}
					/>
					<div className="space-y-2">
						<Label htmlFor="page-shell-padding">Padding</Label>
						<Input
							id="page-shell-padding"
							value={content.padding}
							onChange={(event) => updateContent({ padding: event.target.value })}
							placeholder="2rem 1rem"
						/>
					</div>
					<div className="space-y-2">
						<Label>Background</Label>
						<TokenColorPicker
							property="backgroundColor"
							currentEntry={content.backgroundColor}
							currentStyleValue={content.backgroundColor?.style}
							onChange={(entry: TokenEntry) => updateContent({ backgroundColor: entry })}
						/>
					</div>
					<div className="space-y-2">
						<Label>Text</Label>
						<TokenColorPicker
							property="color"
							currentEntry={content.textColor}
							currentStyleValue={content.textColor?.style}
							onChange={(entry: TokenEntry) => updateContent({ textColor: entry })}
						/>
					</div>
				</div>
			</CollapsibleCard>
		</div>
	);
}

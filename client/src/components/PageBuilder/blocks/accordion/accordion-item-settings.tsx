import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { readAccordionItemContent, type AccordionItemContent } from "@shared/accordion-model";
import { SettingsLabel, SettingsSection } from "../../shared";
import { useSettingsState } from "../useSettingsState";

type AccordionItemSettingsProps = {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
};

/** One item: its title and whether visitors see it open. The answer is edited on the canvas. */
export function AccordionItemSettings({ block, onUpdate }: AccordionItemSettingsProps) {
	const { content: item, updateContent } = useSettingsState<AccordionItemContent>({
		block,
		onUpdate,
		parseContent: readAccordionItemContent,
	});

	return (
		<SettingsSection>
			<div className="space-y-4">
				<div className="space-y-2">
					<SettingsLabel htmlFor={`accordion-item-title-${block.id}`}>Title</SettingsLabel>
					<Input
						id={`accordion-item-title-${block.id}`}
						value={item.title}
						onChange={(event) => updateContent({ title: event.target.value })}
						placeholder="Question or section title"
					/>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<SettingsLabel htmlFor={`accordion-item-open-${block.id}`}>Open at start</SettingsLabel>
						<p className="npb-settings-hint-muted text-xs">Visitors see this answer before they click.</p>
					</div>
					<Switch
						id={`accordion-item-open-${block.id}`}
						checked={item.open}
						onCheckedChange={(checked) => updateContent({ open: checked })}
					/>
				</div>
				<p className="npb-settings-hint-muted text-xs">
					Write the answer on the canvas: open the item with its icon and add any blocks inside.
				</p>
			</div>
		</SettingsSection>
	);
}

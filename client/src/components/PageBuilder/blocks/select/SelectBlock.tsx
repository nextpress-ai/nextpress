import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListFilter, Plus, Trash2 } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { SettingsLabel } from "../../shared";
import {
	DEFAULT_FORM_FIELD_STYLES,
	DEFAULT_SELECT_CONTENT,
	type SelectFieldContent,
	type SelectOption,
} from "@shared/form-field-model";
import { FormFieldSettings } from "../form/form-field-settings";

type SelectRendererProps = {
	content: SelectFieldContent;
	styles?: React.CSSProperties;
};

function SelectRenderer({ content, styles }: SelectRendererProps) {
	const name = content?.name || "choice";
	const ariaLabel = content?.ariaLabel || content?.placeholder || name;
	const options = content?.options?.length ? content.options : DEFAULT_SELECT_CONTENT.options!;

	return (
		<BlockShell blockClass="wp-block-select">
			<select
				name={name}
				defaultValue={content?.defaultValue ?? ""}
				required={content?.required ?? false}
				disabled={content?.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-select__control", content?.className].filter(Boolean).join(" ")}
				style={{
					...DEFAULT_FORM_FIELD_STYLES,
					...styles,
				}}
			>
				{content?.placeholder ? (
					<option value="" disabled hidden>
						{content.placeholder}
					</option>
				) : null}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</BlockShell>
	);
}

function SelectOptionsEditor({
	options,
	onChange,
}: {
	options: SelectOption[];
	onChange: (next: SelectOption[]) => void;
}) {
	const rows = options.length > 0 ? options : [{ label: "", value: "" }];

	const updateRow = (index: number, patch: Partial<SelectOption>) => {
		const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
		onChange(next);
	};

	const addRow = () => onChange([...rows, { label: "New option", value: `option-${rows.length + 1}` }]);

	const removeRow = (index: number) => {
		if (rows.length <= 1) return;
		onChange(rows.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-3">
			<SettingsLabel>Options</SettingsLabel>
			{rows.map((row, index) => (
				<div key={`${index}-${row.value}`} className="flex items-center gap-2">
					<Input
						value={row.label}
						onChange={(e) => updateRow(index, { label: e.target.value })}
						placeholder="Label"
						className="h-9 flex-1 rounded-none"
					/>
					<Input
						value={row.value}
						onChange={(e) => updateRow(index, { value: e.target.value })}
						placeholder="Value"
						className="h-9 w-28 rounded-none"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 rounded-none"
						onClick={() => removeRow(index)}
						disabled={rows.length <= 1}
						aria-label="Remove option"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}
			<Button type="button" variant="outline" size="sm" className="rounded-none" onClick={addRow}>
				<Plus className="mr-2 h-4 w-4" />
				Add option
			</Button>
		</div>
	);
}

function SelectSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	return (
		<FormFieldSettings<SelectFieldContent>
			block={block}
			onUpdate={onUpdate}
			defaultContent={DEFAULT_SELECT_CONTENT}
			extraFields={({ content, updateContent }) => (
				<SelectOptionsEditor
					options={content?.options ?? DEFAULT_SELECT_CONTENT.options ?? []}
					onChange={(options) => updateContent({ options })}
				/>
			)}
		/>
	);
}

const SelectBlock = createBlockDefinition<SelectFieldContent>({
	id: "core/select",
	label: "Dropdown",
	icon: ListFilter,
	description: "Select one option from a list",
	category: "form",
	defaultContent: DEFAULT_SELECT_CONTENT,
	defaultStyles: DEFAULT_FORM_FIELD_STYLES,
	settings: SelectSettings,
	hasSettings: true,
	render: ({ content, styles }) => <SelectRenderer content={content} styles={styles} />,
});

export default SelectBlock;

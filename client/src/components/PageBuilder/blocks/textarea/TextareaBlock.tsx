import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { AlignLeft } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { FormFieldLabel, formFieldControlId } from "@shared/form-field-label";
import { BlockShell } from "../shared/block-shell";
import { SettingsLabel } from "../../shared";
import {
	DEFAULT_FORM_FIELD_STYLES,
	DEFAULT_TEXTAREA_CONTENT,
	type TextareaFieldContent,
} from "@shared/form-field-model";
import { FormFieldSettings } from "../form/form-field-settings";

type TextareaRendererProps = {
	blockId: string;
	content: TextareaFieldContent;
	styles?: React.CSSProperties;
};

function TextareaRenderer({ content, styles, blockId }: TextareaRendererProps) {
	const name = content?.name || "message";
	const ariaLabel = content?.ariaLabel || content?.placeholder || name;
	const rows = content?.rows ?? 4;

	return (
		<BlockShell blockClass="wp-block-textarea">
			<FormFieldLabel label={content?.label} htmlFor={formFieldControlId(blockId)} required={content?.required} />
			<textarea
				id={formFieldControlId(blockId)}
				name={name}
				rows={rows}
				defaultValue={content?.defaultValue ?? ""}
				placeholder={content?.placeholder ?? ""}
				required={content?.required ?? false}
				disabled={content?.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-textarea__control", content?.className].filter(Boolean).join(" ")}
				style={{
					...DEFAULT_FORM_FIELD_STYLES,
					minHeight: `${rows * 1.5}rem`,
					resize: "vertical",
					...styles,
				}}
			/>
		</BlockShell>
	);
}

function TextareaSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	return (
		<FormFieldSettings<TextareaFieldContent>
			block={block}
			onUpdate={onUpdate}
			defaultContent={DEFAULT_TEXTAREA_CONTENT}
			extraFields={({ content, updateContent }) => (
				<div>
					<SettingsLabel htmlFor="textarea-rows">Rows</SettingsLabel>
					<Input
						id="textarea-rows"
						type="number"
						min={2}
						max={24}
						value={content?.rows ?? 4}
						onChange={(e) =>
							updateContent({ rows: Math.max(2, Number.parseInt(e.target.value, 10) || 4) })
						}
						className="h-9 w-24 rounded-none"
					/>
				</div>
			)}
		/>
	);
}

const TextareaBlock = createBlockDefinition<TextareaFieldContent>({
	id: "core/textarea",
	label: "Text area",
	icon: AlignLeft,
	description: "Multi-line text input",
	category: "form",
	defaultContent: DEFAULT_TEXTAREA_CONTENT,
	defaultStyles: DEFAULT_FORM_FIELD_STYLES,
	settings: TextareaSettings,
	hasSettings: true,
	render: ({ content, styles, value }) => <TextareaRenderer content={content} styles={styles} blockId={value.id} />,
});

export default TextareaBlock;

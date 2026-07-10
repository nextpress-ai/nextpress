import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { TextCursorInput } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import {
	DEFAULT_FORM_FIELD_STYLES,
	DEFAULT_INPUT_CONTENT,
	type InputFieldContent,
} from "@shared/form-field-model";
import { FormFieldSettings, InputTypeSelect } from "../form/form-field-settings";

type InputRendererProps = {
	content: InputFieldContent;
	styles?: React.CSSProperties;
};

function InputRenderer({ content, styles }: InputRendererProps) {
	const type = content?.type ?? "text";
	const name = content?.name || "field";
	const ariaLabel = content?.ariaLabel || content?.placeholder || name;

	return (
		<BlockShell blockClass="wp-block-input">
			<input
				type={type}
				name={name}
				defaultValue={content?.defaultValue ?? ""}
				placeholder={content?.placeholder ?? ""}
				required={content?.required ?? false}
				disabled={content?.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-input__control", content?.className].filter(Boolean).join(" ")}
				style={{
					...DEFAULT_FORM_FIELD_STYLES,
					...styles,
				}}
			/>
		</BlockShell>
	);
}

function InputSettings({
	block,
	onUpdate,
}: {
	block: BlockConfig;
	onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
	return (
		<FormFieldSettings<InputFieldContent>
			block={block}
			onUpdate={onUpdate}
			defaultContent={DEFAULT_INPUT_CONTENT}
			extraFields={({ content, updateContent }) => (
				<InputTypeSelect
					value={content?.type ?? "text"}
					onChange={(type) => updateContent({ type })}
				/>
			)}
		/>
	);
}

const InputBlock = createBlockDefinition<InputFieldContent>({
	id: "core/input",
	label: "Text field",
	icon: TextCursorInput,
	description: "Single-line text, search, email, or number input",
	category: "form",
	defaultContent: DEFAULT_INPUT_CONTENT,
	defaultStyles: DEFAULT_FORM_FIELD_STYLES,
	settings: InputSettings,
	hasSettings: true,
	render: ({ content, styles }) => <InputRenderer content={content} styles={styles} />,
});

export default InputBlock;

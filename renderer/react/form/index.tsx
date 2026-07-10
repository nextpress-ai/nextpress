import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps, parseStructuredContent } from "../render-helpers";
import {
	DEFAULT_FORM_FIELD_STYLES,
	DEFAULT_SELECT_CONTENT,
	type InputFieldContent,
	type SelectFieldContent,
	type TextareaFieldContent,
} from "@shared/form-field-model";

/** Text, search, email, and other single-line inputs. */
export function InputBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseStructuredContent(block.content) as InputFieldContent;
	const type = content.type ?? "text";
	const name = content.name || "field";
	const ariaLabel = content.ariaLabel || content.placeholder || name;

	return (
		<input
			type={type}
			name={name}
			defaultValue={content.defaultValue ?? ""}
			placeholder={content.placeholder ?? ""}
			required={content.required ?? false}
			disabled={content.disabled ?? false}
			aria-label={ariaLabel}
			className={["wp-block-input__control", className, content.className].filter(Boolean).join(" ")}
			style={{ ...DEFAULT_FORM_FIELD_STYLES, ...style }}
			{...attributes}
		/>
	);
}

/** Multi-line text input. */
export function TextareaBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseStructuredContent(block.content) as TextareaFieldContent;
	const name = content.name || "message";
	const ariaLabel = content.ariaLabel || content.placeholder || name;
	const rows = content.rows ?? 4;

	return (
		<textarea
			name={name}
			rows={rows}
			defaultValue={content.defaultValue ?? ""}
			placeholder={content.placeholder ?? ""}
			required={content.required ?? false}
			disabled={content.disabled ?? false}
			aria-label={ariaLabel}
			className={["wp-block-textarea__control", className, content.className].filter(Boolean).join(" ")}
			style={{
				...DEFAULT_FORM_FIELD_STYLES,
				minHeight: `${rows * 1.5}rem`,
				resize: "vertical",
				...style,
			}}
			{...attributes}
		/>
	);
}

/** Dropdown select list. */
export function SelectBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const content = parseStructuredContent(block.content) as SelectFieldContent;
	const name = content.name || "choice";
	const ariaLabel = content.ariaLabel || content.placeholder || name;
	const options = content.options?.length ? content.options : DEFAULT_SELECT_CONTENT.options!;

	return (
		<select
			name={name}
			defaultValue={content.defaultValue ?? ""}
			required={content.required ?? false}
			disabled={content.disabled ?? false}
			aria-label={ariaLabel}
			className={["wp-block-select__control", className, content.className].filter(Boolean).join(" ")}
			style={{ ...DEFAULT_FORM_FIELD_STYLES, ...style }}
			{...attributes}
		>
			{content.placeholder ? (
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
	);
}

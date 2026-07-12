import type { BlockConfig } from "@shared/schema-types";
import { getRenderProps } from "../render-helpers";
import {
	DEFAULT_FORM_FIELD_STYLES,
	DEFAULT_INPUT_CONTENT,
	DEFAULT_SELECT_CONTENT,
	DEFAULT_TEXTAREA_CONTENT,
	readFormFieldContent,
	type InputFieldContent,
	type SelectFieldContent,
	type TextareaFieldContent,
} from "@shared/form-field-model";

/** Text, search, email, and other single-line inputs. */
export function InputBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const parsed = readFormFieldContent<InputFieldContent>(block.content);
	const content = { ...DEFAULT_INPUT_CONTENT, ...parsed };
	const type = content.type ?? "text";
	const name = content.name || "field";
	const placeholder = content.placeholder ?? DEFAULT_INPUT_CONTENT.placeholder;
	const ariaLabel = content.ariaLabel || placeholder || name;

	return (
		<div className={["wp-block-input", className].filter(Boolean).join(" ")} {...attributes}>
			<input
				type={type}
				name={name}
				defaultValue={content.defaultValue ?? ""}
				placeholder={placeholder}
				required={content.required ?? false}
				disabled={content.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-input__control", content.className].filter(Boolean).join(" ")}
				style={{ ...DEFAULT_FORM_FIELD_STYLES, ...style }}
			/>
		</div>
	);
}

/** Multi-line text input. */
export function TextareaBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const parsed = readFormFieldContent<TextareaFieldContent>(block.content);
	const content = { ...DEFAULT_TEXTAREA_CONTENT, ...parsed };
	const name = content.name || "message";
	const placeholder = content.placeholder ?? DEFAULT_TEXTAREA_CONTENT.placeholder;
	const ariaLabel = content.ariaLabel || placeholder || name;
	const rows = content.rows ?? 4;

	return (
		<div className={["wp-block-textarea", className].filter(Boolean).join(" ")} {...attributes}>
			<textarea
				name={name}
				rows={rows}
				defaultValue={content.defaultValue ?? ""}
				placeholder={placeholder}
				required={content.required ?? false}
				disabled={content.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-textarea__control", content.className].filter(Boolean).join(" ")}
				style={{
					...DEFAULT_FORM_FIELD_STYLES,
					minHeight: `${rows * 1.5}rem`,
					resize: "vertical",
					...style,
				}}
			/>
		</div>
	);
}

/** Dropdown select list. */
export function SelectBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const parsed = readFormFieldContent<SelectFieldContent>(block.content);
	const content = { ...DEFAULT_SELECT_CONTENT, ...parsed };
	const name = content.name || "choice";
	const placeholder = content.placeholder ?? DEFAULT_SELECT_CONTENT.placeholder;
	const ariaLabel = content.ariaLabel || placeholder || name;
	const options = content.options?.length ? content.options : DEFAULT_SELECT_CONTENT.options!;

	return (
		<div className={["wp-block-select", className].filter(Boolean).join(" ")} {...attributes}>
			<select
				name={name}
				defaultValue={content.defaultValue ?? ""}
				required={content.required ?? false}
				disabled={content.disabled ?? false}
				aria-label={ariaLabel}
				className={["wp-block-select__control", content.className].filter(Boolean).join(" ")}
				style={{ ...DEFAULT_FORM_FIELD_STYLES, ...style }}
			>
				{placeholder ? (
					<option value="" disabled hidden>
						{placeholder}
					</option>
				) : null}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

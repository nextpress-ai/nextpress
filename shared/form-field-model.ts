/** Shared content shape for form field blocks (input, textarea, select). */
export type FormFieldBase = {
	name?: string;
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
	className?: string;
};

export type InputFieldType =
	| "text"
	| "email"
	| "search"
	| "password"
	| "number"
	| "tel"
	| "url";

export type InputFieldContent = FormFieldBase & {
	type?: InputFieldType;
};

export type TextareaFieldContent = FormFieldBase & {
	rows?: number;
};

export type SelectOption = {
	label: string;
	value: string;
};

export type SelectFieldContent = FormFieldBase & {
	options?: SelectOption[];
};

export const DEFAULT_INPUT_CONTENT: InputFieldContent = {
	type: "text",
	name: "field",
	placeholder: "Enter text",
	defaultValue: "",
	required: false,
	disabled: false,
};

export const DEFAULT_TEXTAREA_CONTENT: TextareaFieldContent = {
	name: "message",
	placeholder: "Enter your message",
	defaultValue: "",
	rows: 4,
	required: false,
	disabled: false,
};

export const DEFAULT_SELECT_CONTENT: SelectFieldContent = {
	name: "choice",
	placeholder: "Choose an option",
	defaultValue: "",
	options: [
		{ label: "Option one", value: "option-1" },
		{ label: "Option two", value: "option-2" },
	],
	required: false,
	disabled: false,
};

export const DEFAULT_FORM_FIELD_STYLES: Record<string, string> = {
	width: "100%",
	padding: "8px 12px",
	fontSize: "16px",
	lineHeight: "1.5",
	border: "1px solid hsl(var(--border))",
	borderRadius: "0.375rem",
	backgroundColor: "hsl(var(--background))",
	color: "hsl(var(--foreground))",
	boxSizing: "border-box",
};

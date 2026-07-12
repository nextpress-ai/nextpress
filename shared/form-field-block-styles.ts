/** Block names for form field controls (input, textarea, select). */
export const FORM_FIELD_BLOCK_NAMES = [
	"core/input",
	"core/textarea",
	"core/select",
] as const;

export type FormFieldBlockName = (typeof FORM_FIELD_BLOCK_NAMES)[number];

const FORM_FIELD_CONTROL_CLASS: Record<FormFieldBlockName, string> = {
	"core/input": "wp-block-input__control",
	"core/textarea": "wp-block-textarea__control",
	"core/select": "wp-block-select__control",
};

/** Returns true when the block renders a native form control surface. */
export function isFormFieldBlockName(name: string): name is FormFieldBlockName {
	return FORM_FIELD_BLOCK_NAMES.includes(name as FormFieldBlockName);
}

/**
 * Modifier/hover CSS must target the native control, not the full-width block wrapper.
 * Compound selector covers editor (wrapper > control) and publish path (both classes on control).
 */
export function getFormFieldModifierCssSelector(
	blockId: string,
	blockName: FormFieldBlockName,
): string {
	const controlClass = FORM_FIELD_CONTROL_CLASS[blockName];
	return `.block-${blockId}.${controlClass}, .block-${blockId} .${controlClass}`;
}

/** Returns a form-field-specific modifier selector for input, textarea, and select blocks. */
export function resolveFormFieldModifierSelector(block: {
	name: string;
	id: string;
}): string | undefined {
	if (isFormFieldBlockName(block.name)) {
		return getFormFieldModifierCssSelector(block.id, block.name);
	}
	return undefined;
}

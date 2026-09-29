import type { BlockConfig, BlockContent } from "./schema-types.js";
import {
	DEFAULT_INPUT_CONTENT,
	DEFAULT_SELECT_CONTENT,
	DEFAULT_TEXTAREA_CONTENT,
	readFormFieldContent,
	type InputFieldContent,
	type SelectFieldContent,
} from "./form-field-model.js";
import { unwrapStructured } from "./page-shell-model.js";

export const FORM_BLOCK_NAME = "core/form";

/** Largest answer accepted per field; longer text is refused, never cut silently. */
export const FORM_VALUE_MAX_CHARS = 5000;
/** Hidden field people never see; bots fill it. A send with it filled is dropped quietly. */
export const FORM_TRAP_FIELD = "np_website";

const FIELD_BLOCKS: Record<string, "input" | "textarea" | "select"> = {
	"core/input": "input",
	"core/textarea": "textarea",
	"core/select": "select",
};

export type FormContent = {
	/** Name shown in admin next to each submission, e.g. "Waitlist". */
	name: string;
	/** Shown in place of the form once it is sent. */
	successMessage: string;
};

export const DEFAULT_FORM_CONTENT: FormContent = {
	name: "Contact",
	successMessage: "Thanks! We got your message and will be in touch.",
};

export function readFormContent(raw: BlockContent | undefined): FormContent {
	const data = unwrapStructured(raw);
	const name = typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 120) : DEFAULT_FORM_CONTENT.name;
	const successMessage =
		typeof data.successMessage === "string" && data.successMessage.trim()
			? data.successMessage.trim().slice(0, 500)
			: DEFAULT_FORM_CONTENT.successMessage;
	return { name, successMessage };
}

/** One question in a form, as read from its field block. */
export type FormFieldSpec = {
	name: string;
	label: string;
	kind: "input" | "textarea" | "select";
	inputType: string;
	required: boolean;
	/** Allowed answers for a dropdown: what is sent, and the text the visitor saw. */
	options?: { value: string; label: string }[];
};

/** Every field inside a form block, in page order. Fields with the same name count once. */
export function collectFormFields(form: BlockConfig): FormFieldSpec[] {
	const found: FormFieldSpec[] = [];
	const walk = (blocks: readonly BlockConfig[]) =>
		blocks.forEach((block) => {
			const kind = FIELD_BLOCKS[block.name];
			if (kind) {
				const defaults =
					kind === "input" ? DEFAULT_INPUT_CONTENT : kind === "textarea" ? DEFAULT_TEXTAREA_CONTENT : DEFAULT_SELECT_CONTENT;
				const content = { ...defaults, ...readFormFieldContent<InputFieldContent & SelectFieldContent>(block.content) };
				const name = (content.name || defaults.name || "field").trim();
				if (!found.some((field) => field.name === name)) {
					found.push({
						name,
						label: (content.label || content.placeholder || name).trim(),
						kind,
						inputType: kind === "input" ? (content.type ?? "text") : kind,
						required: content.required === true,
						...(kind === "select"
							? {
									options: (content.options?.length ? content.options : (DEFAULT_SELECT_CONTENT.options ?? [])).map((o) => ({
										value: o.value,
										label: o.label || o.value,
									})),
								}
							: {}),
					});
				}
			}
			walk(block.children ?? []);
		});
	walk(form.children ?? []);
	return found;
}

/** The form block with this id anywhere in a page, or nothing. */
export function findFormBlock(blocks: readonly BlockConfig[], formId: string): BlockConfig | null {
	for (const block of blocks) {
		if (block.id === formId && block.name === FORM_BLOCK_NAME) return block;
		const inside = findFormBlock(block.children ?? [], formId);
		if (inside) return inside;
	}
	return null;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

export type SubmittedField = { name: string; label: string; value: string };

export type FormCheckResult =
	| { ok: true; fields: SubmittedField[] }
	| { ok: false; message: string; field?: string };

/**
 * Checks a send against the form as it is on the page: only its own fields are kept, required
 * ones must be filled, emails must look like emails, and dropdowns must hold one of their
 * choices. Messages say what to fix in plain words.
 */
export function checkFormSubmission({
	specs,
	values,
}: {
	specs: readonly FormFieldSpec[];
	values: Record<string, unknown>;
}): FormCheckResult {
	const fields: SubmittedField[] = [];
	for (const spec of specs) {
		const raw = values[spec.name];
		const value = typeof raw === "string" ? raw.trim() : "";
		if (!value) {
			if (spec.required) return { ok: false, field: spec.name, message: `Please fill in "${spec.label}".` };
			continue;
		}
		if (value.length > FORM_VALUE_MAX_CHARS) {
			return { ok: false, field: spec.name, message: `"${spec.label}" is too long. Please shorten it.` };
		}
		if (spec.inputType === "email" && !EMAIL.test(value)) {
			return { ok: false, field: spec.name, message: `Please enter a valid email for "${spec.label}".` };
		}
		const choice = spec.kind === "select" ? spec.options?.find((option) => option.value === value) : undefined;
		if (spec.kind === "select" && spec.options && !choice) {
			return { ok: false, field: spec.name, message: `Please pick one of the choices for "${spec.label}".` };
		}
		// A dropdown answer is kept as the words the visitor picked, so submissions read plainly.
		fields.push({ name: spec.name, label: spec.label, value: choice?.label ?? value });
	}
	if (fields.length === 0) return { ok: false, message: "Please fill in the form before sending." };
	return { ok: true, fields };
}

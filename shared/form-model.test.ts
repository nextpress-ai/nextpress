import { describe, expect, it } from "vitest";
import type { BlockConfig } from "./schema-types";
import { checkFormSubmission, collectFormFields, findFormBlock, readFormContent, FORM_VALUE_MAX_CHARS } from "./form-model";

const field = (id: string, name: string, blockName: string, data: Record<string, unknown>): BlockConfig => ({
	id,
	name: blockName,
	type: "block",
	parentId: "form-1",
	content: { kind: "structured", data: { name, ...data } },
});

const form: BlockConfig = {
	id: "form-1",
	name: "core/form",
	type: "container",
	parentId: null,
	content: { kind: "structured", data: { name: "Waitlist" } },
	children: [
		{
			id: "cols",
			name: "core/columns",
			type: "container",
			parentId: "form-1",
			content: { kind: "structured", data: {} },
			children: [field("f1", "name", "core/input", { label: "Your Name" }), field("f2", "role", "core/input", { placeholder: "Role" })],
		},
		field("f3", "email", "core/input", { label: "Your email", type: "email", required: true }),
		field("f4", "message", "core/textarea", { label: "Message" }),
		field("f5", "use", "core/select", {
			label: "How have you used WordPress?",
			options: [
				{ label: "I don't use WordPress", value: "none" },
				{ label: "I own a website", value: "site" },
			],
		}),
	],
};

describe("collectFormFields", () => {
	it("finds every field inside the form, even inside columns, with its label", () => {
		const specs = collectFormFields(form);
		expect(specs.map((spec) => [spec.name, spec.label, spec.required])).toEqual([
			["name", "Your Name", false],
			["role", "Role", false],
			["email", "Your email", true],
			["message", "Message", false],
			["use", "How have you used WordPress?", false],
		]);
		expect(specs.find((spec) => spec.name === "use")?.options).toEqual([
			{ value: "none", label: "I don't use WordPress" },
			{ value: "site", label: "I own a website" },
		]);
	});

	it("finds the form inside a page tree", () => {
		expect(findFormBlock([{ ...form, id: "x", name: "core/group", children: [form] }], "form-1")?.id).toBe("form-1");
		expect(findFormBlock([form], "f3")).toBeNull();
	});
});

describe("checkFormSubmission", () => {
	const specs = collectFormFields(form);

	it("keeps only the form's own answers, trimmed and labelled", () => {
		const result = checkFormSubmission({
			specs,
			values: { name: "  Ada ", email: "ada@example.com", use: "site", extra: "not asked", message: "" },
		});
		expect(result).toEqual({
			ok: true,
			fields: [
				{ name: "name", label: "Your Name", value: "Ada" },
				{ name: "email", label: "Your email", value: "ada@example.com" },
				{ name: "use", label: "How have you used WordPress?", value: "I own a website" },
			],
		});
	});

	it("says in plain words what to fix", () => {
		expect(checkFormSubmission({ specs, values: { name: "Ada" } })).toMatchObject({
			ok: false,
			field: "email",
			message: 'Please fill in "Your email".',
		});
		expect(checkFormSubmission({ specs, values: { email: "not-an-email" } })).toMatchObject({ ok: false, field: "email" });
		expect(checkFormSubmission({ specs, values: { email: "a@b.co", use: "hacked" } })).toMatchObject({ ok: false, field: "use" });
		expect(
			checkFormSubmission({ specs, values: { email: "a@b.co", message: "x".repeat(FORM_VALUE_MAX_CHARS + 1) } }),
		).toMatchObject({ ok: false, field: "message" });
	});

	it("reads form settings with safe defaults", () => {
		expect(readFormContent({ kind: "structured", data: { name: " Waitlist " } })).toEqual({
			name: "Waitlist",
			successMessage: "Thanks! We got your message and will be in touch.",
		});
	});
});

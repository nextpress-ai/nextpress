import { describe, it, expect } from "vitest";
import {
	getFormFieldModifierCssSelector,
	isFormFieldBlockName,
	resolveFormFieldModifierSelector,
} from "@shared/form-field-block-styles";

describe("form field modifier selector", () => {
	it("targets the native control for form field blocks", () => {
		expect(getFormFieldModifierCssSelector("fld-1", "core/input")).toBe(
			".block-fld-1.wp-block-input__control, .block-fld-1 .wp-block-input__control",
		);
		expect(getFormFieldModifierCssSelector("fld-2", "core/textarea")).toBe(
			".block-fld-2.wp-block-textarea__control, .block-fld-2 .wp-block-textarea__control",
		);
		expect(getFormFieldModifierCssSelector("fld-3", "core/select")).toBe(
			".block-fld-3.wp-block-select__control, .block-fld-3 .wp-block-select__control",
		);
	});

	it("resolves only for form field block names", () => {
		expect(isFormFieldBlockName("core/input")).toBe(true);
		expect(isFormFieldBlockName("core/heading")).toBe(false);
		expect(
			resolveFormFieldModifierSelector({ name: "core/input", id: "fld-1" }),
		).toBe(".block-fld-1.wp-block-input__control, .block-fld-1 .wp-block-input__control");
		expect(
			resolveFormFieldModifierSelector({ name: "core/heading", id: "h-1" }),
		).toBeUndefined();
	});
});

import { describe, it, expect } from "vitest";
import {
	splitButtonBlockStyles,
	getButtonModifierCssSelector,
	resolveButtonBlockModifierSelector,
} from "@shared/button-block-styles";

describe("splitButtonBlockStyles", () => {
	it("puts background and padding on the anchor, not the shell", () => {
		const { shellStyles, anchorStyles } = splitButtonBlockStyles({
			backgroundColor: "#ec4899",
			color: "#ffffff",
			padding: "12px 24px",
			borderRadius: "4px",
			textAlign: "center",
			margin: "8px 0",
			width: "200px",
		});

		expect(anchorStyles).toMatchObject({
			backgroundColor: "#ec4899",
			color: "#ffffff",
			padding: "12px 24px",
			borderRadius: "4px",
		});
		expect(shellStyles).toMatchObject({
			textAlign: "center",
			margin: "8px 0",
			width: "200px",
		});
		expect(shellStyles.backgroundColor).toBeUndefined();
		expect(anchorStyles.textAlign).toBeUndefined();
	});

	it("keeps shell display separate from anchor visuals", () => {
		const { shellStyles, anchorStyles } = splitButtonBlockStyles({
			display: "inline-block",
			backgroundColor: "#007cba",
		});

		expect(shellStyles.display).toBe("inline-block");
		expect(anchorStyles.backgroundColor).toBe("#007cba");
	});
});

describe("button modifier selector", () => {
	it("targets the link element for core/button blocks", () => {
		expect(getButtonModifierCssSelector("btn-1")).toBe(
			".block-btn-1.wp-block-button__link",
		);
		expect(
			resolveButtonBlockModifierSelector({ name: "core/button", id: "btn-1" }),
		).toBe(".block-btn-1.wp-block-button__link");
		expect(
			resolveButtonBlockModifierSelector({ name: "core/heading", id: "h-1" }),
		).toBeUndefined();
	});
});

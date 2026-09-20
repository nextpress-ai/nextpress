import { describe, expect, it } from "vitest";
import {
	buildSpacingStyles,
	expandSpacingShorthand,
	readSpacingSides,
	spacingSideKeys,
	spacingSidesMatch,
} from "./spacing-styles";

describe("expandSpacingShorthand", () => {
	it("follows CSS box rules for 1, 2, 3 and 4 values", () => {
		expect(expandSpacingShorthand("1rem")).toEqual({ top: "1rem", right: "1rem", bottom: "1rem", left: "1rem" });
		expect(expandSpacingShorthand("1rem 2rem")).toEqual({ top: "1rem", right: "2rem", bottom: "1rem", left: "2rem" });
		expect(expandSpacingShorthand("1px 2px 3px")).toEqual({ top: "1px", right: "2px", bottom: "3px", left: "2px" });
		expect(expandSpacingShorthand("1px 2px 3px 4px")).toEqual({ top: "1px", right: "2px", bottom: "3px", left: "4px" });
		expect(expandSpacingShorthand(undefined)).toEqual({ top: "", right: "", bottom: "", left: "" });
	});
});

describe("readSpacingSides", () => {
	it("lets a longhand win over the shorthand", () => {
		const sides = readSpacingSides({ styles: { padding: "1rem", paddingTop: "3rem" }, kind: "padding" });
		expect(sides).toEqual({ top: "3rem", right: "1rem", bottom: "1rem", left: "1rem" });
		expect(spacingSidesMatch(sides)).toBe(false);
	});
});

describe("buildSpacingStyles", () => {
	it("sets all four sides in one patch and clears the shorthand with null", () => {
		const next = buildSpacingStyles({
			resolved: { padding: "1rem" },
			previous: { padding: "1rem", color: "red" },
			cssKeys: spacingSideKeys("padding"),
			value: "2rem",
		});
		expect(next).toMatchObject({
			paddingTop: "2rem",
			paddingRight: "2rem",
			paddingBottom: "2rem",
			paddingLeft: "2rem",
			padding: null,
			color: "red",
		});
	});

	it("keeps the other three sides when one side is edited under a shorthand", () => {
		const next = buildSpacingStyles({
			resolved: { padding: "1rem 2rem" },
			previous: { padding: "1rem 2rem" },
			cssKeys: ["paddingTop"],
			value: "5rem",
		});
		expect(next).toMatchObject({
			paddingTop: "5rem",
			paddingRight: "2rem",
			paddingBottom: "1rem",
			paddingLeft: "2rem",
			padding: null,
		});
	});

	it("does not overwrite a longhand that is already set", () => {
		const next = buildSpacingStyles({
			resolved: { padding: "1rem", paddingLeft: "9px" },
			previous: { padding: "1rem", paddingLeft: "9px" },
			cssKeys: ["paddingTop"],
			value: "0",
		});
		expect(next.paddingLeft).toBe("9px");
		expect(next.paddingTop).toBe("0");
	});

	it("clears sides with explicit null so a deep merge removes them", () => {
		const next = buildSpacingStyles({
			resolved: {},
			previous: { marginTop: "1rem" },
			cssKeys: ["marginTop"],
			value: "",
		});
		expect(next.marginTop).toBeNull();
	});

	it("only touches the kind being edited", () => {
		const next = buildSpacingStyles({
			resolved: { padding: "1rem", margin: "2rem" },
			previous: { padding: "1rem", margin: "2rem" },
			cssKeys: ["marginTop"],
			value: "0",
		});
		expect(next.padding).toBe("1rem");
		expect(next.margin).toBeNull();
	});
});

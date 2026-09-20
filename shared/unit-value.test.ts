import { describe, expect, it } from "vitest";
import {
	SIZE_UNITS,
	composeUnitValue,
	isCompleteNumber,
	isPartialNumber,
	parseUnitValue,
} from "./unit-value";

const parse = (value: string | undefined, keywords: string[] = []) =>
	parseUnitValue({ value, units: SIZE_UNITS, keywords });

describe("parseUnitValue", () => {
	it("splits a number from its unit", () => {
		expect(parse("24px")).toEqual({ kind: "amount", amount: "24", unit: "px" });
		expect(parse("1.5rem")).toEqual({ kind: "amount", amount: "1.5", unit: "rem" });
		expect(parse("50%")).toEqual({ kind: "amount", amount: "50", unit: "%" });
		expect(parse("-0.25em")).toEqual({ kind: "amount", amount: "-0.25", unit: "em" });
		expect(parse(".5rem")).toEqual({ kind: "amount", amount: ".5", unit: "rem" });
	});

	it("reads a bare number as an amount with no unit yet", () => {
		expect(parse("0")).toEqual({ kind: "amount", amount: "0", unit: "" });
		expect(parse("12")).toEqual({ kind: "amount", amount: "12", unit: "" });
	});

	it("is not case sensitive for units and keywords", () => {
		expect(parse("24PX")).toEqual({ kind: "amount", amount: "24", unit: "px" });
		expect(parse("AUTO", ["auto"])).toEqual({ kind: "keyword", keyword: "auto" });
	});

	it("treats an empty value as empty", () => {
		expect(parse(undefined)).toEqual({ kind: "empty" });
		expect(parse("   ")).toEqual({ kind: "empty" });
	});

	it("keeps expressions, shorthands and unknown units exactly as typed", () => {
		expect(parse("calc(100% - 2rem)")).toEqual({ kind: "raw", raw: "calc(100% - 2rem)" });
		expect(parse("2rem 1rem")).toEqual({ kind: "raw", raw: "2rem 1rem" });
		expect(parse("12furlong")).toEqual({ kind: "raw", raw: "12furlong" });
		expect(parse("auto")).toEqual({ kind: "raw", raw: "auto" });
	});

	it("respects the units a field allows", () => {
		expect(parseUnitValue({ value: "50vh", units: SIZE_UNITS })).toEqual({ kind: "raw", raw: "50vh" });
		expect(parseUnitValue({ value: "50vh", units: [...SIZE_UNITS, "vh"] })).toEqual({
			kind: "amount",
			amount: "50",
			unit: "vh",
		});
	});
});

describe("composeUnitValue", () => {
	it("joins a finished number and a unit", () => {
		expect(composeUnitValue({ amount: "24", unit: "px" })).toBe("24px");
		expect(composeUnitValue({ amount: "1.5", unit: "rem" })).toBe("1.5rem");
		expect(composeUnitValue({ amount: "0", unit: "px" })).toBe("0px");
	});

	it("saves nothing for an empty or unfinished number", () => {
		expect(composeUnitValue({ amount: "", unit: "px" })).toBeUndefined();
		expect(composeUnitValue({ amount: "-", unit: "px" })).toBeUndefined();
		expect(composeUnitValue({ amount: ".", unit: "px" })).toBeUndefined();
	});

	it("tidies the number so the result is always valid CSS", () => {
		expect(composeUnitValue({ amount: "1.", unit: "px" })).toBe("1px");
		expect(composeUnitValue({ amount: ".5", unit: "rem" })).toBe("0.5rem");
		expect(composeUnitValue({ amount: "-0.50", unit: "em" })).toBe("-0.5em");
	});

	it("keeps a plain number for a unitless field", () => {
		expect(composeUnitValue({ amount: "1.6", unit: "" })).toBe("1.6");
		expect(composeUnitValue({ amount: "0", unit: "" })).toBe("0");
	});
});

describe("number checks", () => {
	it("tells finished numbers from ones still being typed", () => {
		for (const text of ["12", "-3", ".5", "1.5", "1."]) expect(isCompleteNumber(text)).toBe(true);
		for (const text of ["", "-", ".", "1e", "12px"]) expect(isCompleteNumber(text)).toBe(false);
		for (const text of ["", "-", ".", "1.", "12", "-.5"]) expect(isPartialNumber(text)).toBe(true);
		expect(isPartialNumber("12px")).toBe(false);
	});
});

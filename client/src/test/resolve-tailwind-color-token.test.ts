import { describe, expect, it } from "vitest";
import {
	normalizeHexColor,
	resolveTailwindColorToken,
} from "@/lib/resolve-tailwind-color-token";

describe("resolveTailwindColorToken", () => {
	it("normalizes short hex values", () => {
		expect(normalizeHexColor("#fff")).toBe("#ffffff");
	});

	it("resolves a standard palette shade", () => {
		const resolved = resolveTailwindColorToken("#3b82f6");
		expect(resolved).toEqual({ family: "blue", shade: "500" });
	});

	it("returns null for unknown custom colors", () => {
		expect(resolveTailwindColorToken("#123456")).toBeNull();
	});
});

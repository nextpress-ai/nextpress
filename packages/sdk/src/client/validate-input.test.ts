import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseInput } from "./validate-input.js";

describe("parseInput", () => {
	it("returns parsed data on valid input", () => {
		const schema = z.object({ title: z.string().min(1) });
		const result = parseInput({
			schema,
			input: { title: "Hello" },
			label: "test",
		});
		expect(result.title).toBe("Hello");
	});

	it("throws descriptive error on invalid input", () => {
		const schema = z.object({ title: z.string().min(1) });
		expect(() => parseInput({ schema, input: { title: "" }, label: "test" })).toThrow(
			"Invalid test",
		);
	});
});

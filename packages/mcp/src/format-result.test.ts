import { describe, expect, it } from "vitest";
import {
	isNextpressError,
	NextpressError,
	sdkErr,
	sdkOk,
	VERSION_STALE,
} from "@nextpress-org/sdk";
import { formatError, formatSdkResult } from "./format-result.js";

describe("formatSdkResult", () => {
	it("serializes success values", () => {
		const result = formatSdkResult(sdkOk({ id: "p1", title: "Hello" }));
		expect(result.isError).toBeUndefined();
		expect(JSON.parse(result.content[0].text)).toEqual({ id: "p1", title: "Hello" });
	});

	it("marks VERSION_STALE with re-fetch hint", () => {
		const error = new NextpressError({
			message: "stale",
			status: 409,
			code: VERSION_STALE,
		});
		const result = formatSdkResult(sdkErr(error));
		expect(result.isError).toBe(true);
		const body = JSON.parse(result.content[0].text) as {
			code: string;
			hint: string;
		};
		expect(body.code).toBe(VERSION_STALE);
		expect(body.hint).toMatch(/expectedVersion/);
	});
});

describe("formatError", () => {
	it("handles NextpressError", () => {
		const error = new NextpressError({ message: "nope", status: 403, code: "DENIED" });
		expect(isNextpressError(error)).toBe(true);
		const result = formatError(error);
		expect(result.isError).toBe(true);
		expect(JSON.parse(result.content[0].text).status).toBe(403);
	});

	it("handles plain Error", () => {
		const result = formatError(new Error("boom"));
		expect(result.isError).toBe(true);
		expect(JSON.parse(result.content[0].text).message).toBe("boom");
	});
});

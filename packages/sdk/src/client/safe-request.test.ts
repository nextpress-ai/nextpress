import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./http-client.js";
import { NextpressError } from "./nextpress-error.js";
import { safeHttpRequest } from "./safe-request.js";
import { VERSION_STALE } from "./sdk-result.js";

describe("safeHttpRequest", () => {
	it("returns SdkOk on success", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			Response.json({ id: "p1", title: "Test" }, { status: 200 }),
		);
		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock,
		});

		const result = await safeHttpRequest<{ id: string }>(http, "/api/pages/p1");
		expect(result.isErr).toBe(false);
		if (!result.isErr) {
			expect(result.value.id).toBe("p1");
		}
	});

	it("returns SdkErr with VERSION_STALE and warns", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchMock = vi.fn().mockResolvedValue(
			Response.json(
				{
					code: VERSION_STALE,
					message: "stale",
					remoteVersion: 2,
					expectedVersion: 1,
				},
				{ status: 409 },
			),
		);
		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock,
		});

		const result = await safeHttpRequest(http, "/api/pages/p1", { method: "PUT", body: {} });
		expect(result.isErr).toBe(true);
		expect(result.isError).toBe(true);
		if (result.isErr) {
			expect(result.error).toBeInstanceOf(NextpressError);
			expect(result.error.code).toBe(VERSION_STALE);
		}
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

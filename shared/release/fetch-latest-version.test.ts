import { describe, it, expect } from "vitest";
import {
	fetchLatestReleaseVersion,
	normalizeReleaseTag,
	isUpdateAvailable,
} from "./fetch-latest-version";

describe("normalizeReleaseTag", () => {
	it("strips v prefix", () => {
		expect(normalizeReleaseTag("v1.0.13")).toBe("1.0.13");
		expect(normalizeReleaseTag("1.0.12")).toBe("1.0.12");
	});
});

describe("isUpdateAvailable", () => {
	it("detects when GitHub latest is newer than installed", () => {
		expect(isUpdateAvailable({ installedVersion: "1.0.12", latestVersion: "1.0.13" })).toBe(
			true,
		);
	});
});

describe("fetchLatestReleaseVersion", () => {
	it("parses GitHub latest release tag", async () => {
		const result = await fetchLatestReleaseVersion({
			fallbackVersion: "1.0.12",
			fetchFn: async () =>
				new Response(JSON.stringify({ tag_name: "v1.0.13" }), { status: 200 }),
		});

		expect(result.latestVersion).toBe("1.0.13");
		expect(result.source).toBe("github");
		expect(result.checkOk).toBe(true);
	});

	it("falls back when GitHub is unreachable", async () => {
		const result = await fetchLatestReleaseVersion({
			fallbackVersion: "1.0.12",
			fetchFn: async () => {
				throw new Error("network");
			},
		});

		expect(result.latestVersion).toBe("1.0.12");
		expect(result.checkOk).toBe(false);
	});
});

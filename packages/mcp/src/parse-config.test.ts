import { describe, expect, it } from "vitest";
import { parseMcpConfig } from "./parse-config.js";

describe("parseMcpConfig", () => {
	it("reads env when flags absent", () => {
		const config = parseMcpConfig({
			argv: [],
			env: {
				NEXTPRESS_URL: "https://demo.example/",
				NEXTPRESS_API_KEY: "npk_live_test",
				NEXTPRESS_SITE_ID: "11111111-1111-1111-1111-111111111111",
			},
		});
		expect(config).toEqual({
			baseUrl: "https://demo.example",
			apiKey: "npk_live_test",
			siteId: "11111111-1111-1111-1111-111111111111",
		});
	});

	it("lets flags override env", () => {
		const config = parseMcpConfig({
			argv: [
				"--url",
				"https://flag.example",
				"--api-key",
				"npk_live_flag",
				"--site-id",
				"22222222-2222-2222-2222-222222222222",
			],
			env: {
				NEXTPRESS_URL: "https://env.example",
				NEXTPRESS_API_KEY: "npk_live_env",
				NEXTPRESS_SITE_ID: "11111111-1111-1111-1111-111111111111",
			},
		});
		expect(config.baseUrl).toBe("https://flag.example");
		expect(config.apiKey).toBe("npk_live_flag");
		expect(config.siteId).toBe("22222222-2222-2222-2222-222222222222");
	});

	it("throws when URL missing", () => {
		expect(() =>
			parseMcpConfig({
				argv: [],
				env: {
					NEXTPRESS_API_KEY: "npk_live_test",
					NEXTPRESS_SITE_ID: "11111111-1111-1111-1111-111111111111",
				},
			}),
		).toThrow(/NEXTPRESS_URL/);
	});

	it("throws when API key missing", () => {
		expect(() =>
			parseMcpConfig({
				argv: ["--url", "https://demo.example"],
				env: { NEXTPRESS_SITE_ID: "11111111-1111-1111-1111-111111111111" },
			}),
		).toThrow(/NEXTPRESS_API_KEY/);
	});

	it("throws when site id missing", () => {
		expect(() =>
			parseMcpConfig({
				argv: ["--url", "https://demo.example", "--api-key", "npk_live_test"],
				env: {},
			}),
		).toThrow(/NEXTPRESS_SITE_ID/);
	});
});

import { describe, expect, it } from "vitest";
import {
	API_KEY_SCOPE_CATALOG,
	API_KEY_SCOPE_IDS,
	apiKeyScopesAllow,
	expandApiKeyScopes,
	formatApiKeyScopeLabel,
	normalizeApiKeyScopes,
	resolveRequiredApiKeyScopes,
} from "./api-key-scopes";

describe("normalizeApiKeyScopes", () => {
	it("filters unknown values and deduplicates", () => {
		expect(
			normalizeApiKeyScopes(["content:read", "content:read", "bogus", 1, null]),
		).toEqual(["content:read"]);
	});

	it("returns empty array for non-array input", () => {
		expect(normalizeApiKeyScopes("content:read")).toEqual([]);
	});
});

describe("expandApiKeyScopes", () => {
	it("adds read scope when write is granted", () => {
		const expanded = expandApiKeyScopes(["content:write"]);
		expect(expanded.has("content:write")).toBe(true);
		expect(expanded.has("content:read")).toBe(true);
	});

	it("expands write scopes across domains", () => {
		const expanded = expandApiKeyScopes(["settings:write", "users:write"]);
		expect(expanded.has("settings:read")).toBe(true);
		expect(expanded.has("users:read")).toBe(true);
	});
});

describe("apiKeyScopesAllow", () => {
	it("allows content write to satisfy content read", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["content:write"],
				required: ["content:read"],
			}),
		).toBe(true);
	});

	it("denies missing scopes", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["content:read"],
				required: ["content:write"],
			}),
		).toBe(false);
	});

	it("requires at least one scope for identity-only routes", () => {
		expect(apiKeyScopesAllow({ granted: [], required: [] })).toBe(false);
		expect(apiKeyScopesAllow({ granted: ["content:read"], required: [] })).toBe(true);
	});

	it("denies partial keys on full-access routes", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["content:read"],
				required: [...API_KEY_SCOPE_IDS],
			}),
		).toBe(false);
	});
});

describe("formatApiKeyScopeLabel", () => {
	it("returns catalog label for known scopes", () => {
		expect(formatApiKeyScopeLabel("content:read")).toBe("Read content");
	});

	it("falls back to raw id for unknown scopes", () => {
		expect(formatApiKeyScopeLabel("custom:scope")).toBe("custom:scope");
	});
});

describe("catalog coverage", () => {
	it("catalog includes every canonical scope id", () => {
		const catalogIds = new Set(API_KEY_SCOPE_CATALOG.map((entry) => entry.id));
		for (const scopeId of API_KEY_SCOPE_IDS) {
			expect(catalogIds.has(scopeId)).toBe(true);
		}
	});
});

describe("resolveRequiredApiKeyScopes", () => {
	it("skips public and dashboard-only routes", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/health" }),
		).toBeNull();
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/auth/api-keys" }),
		).toBeNull();
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/auth/sign-in/email" }),
		).toBeNull();
	});

	it("strips query strings before matching", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/pages?status=draft" }),
		).toEqual(["content:read"]);
	});

	it("allows any scoped key for auth identity", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/auth/user" }),
		).toEqual([]);
	});

	it("requires content read for page list GET", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/pages" }),
		).toEqual(["content:read"]);
	});

	it("requires content write for page create POST", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/pages" }),
		).toEqual(["content:write"]);
	});

	it("requires preview write for share token mint", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/preview/tokens" }),
		).toEqual(["preview:write"]);
	});

	it("requires settings read for options GET", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/options/site_title" }),
		).toEqual(["settings:read"]);
	});

	it("requires users write for user delete", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "DELETE", path: "/api/users/abc" }),
		).toEqual(["users:write"]);
	});

	it("requires system write for import POST", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/import/wordpress/start" }),
		).toEqual(["system:write"]);
	});

	it("requires content read for dashboard stats", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/dashboard/stats" }),
		).toEqual(["content:read"]);
	});

	it("requires full access for unmapped api routes", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/future-endpoint" }),
		).toEqual([...API_KEY_SCOPE_IDS]);
	});

	it("returns null for non-api paths", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/admin/settings" }),
		).toBeNull();
	});
});

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
			normalizeApiKeyScopes(["posts:read", "posts:read", "bogus", 1, null]),
		).toEqual(["posts:read"]);
	});

	it("accepts legacy content scopes", () => {
		expect(normalizeApiKeyScopes(["content:read", "content:write"])).toEqual([
			"content:read",
			"content:write",
		]);
	});

	it("returns empty array for non-array input", () => {
		expect(normalizeApiKeyScopes("posts:read")).toEqual([]);
	});
});

describe("expandApiKeyScopes", () => {
	it("adds read scope when write is granted for a resource", () => {
		const expanded = expandApiKeyScopes(["posts:write"]);
		expect(expanded.has("posts:write")).toBe(true);
		expect(expanded.has("posts:read")).toBe(true);
	});

	it("expands legacy content write to all content resource scopes", () => {
		const expanded = expandApiKeyScopes(["content:write"]);
		expect(expanded.has("pages:write")).toBe(true);
		expect(expanded.has("posts:read")).toBe(true);
		expect(expanded.has("hooks:read")).toBe(true);
		expect(expanded.has("dashboard:read")).toBe(true);
	});

	it("expands write scopes across domains", () => {
		const expanded = expandApiKeyScopes(["settings:write", "users:write"]);
		expect(expanded.has("settings:read")).toBe(true);
		expect(expanded.has("users:read")).toBe(true);
	});
});

describe("apiKeyScopesAllow", () => {
	it("allows posts write to satisfy posts read", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["posts:write"],
				required: ["posts:read"],
			}),
		).toBe(true);
	});

	it("denies posts-only key for pages routes", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["posts:read", "posts:write"],
				required: ["pages:read"],
			}),
		).toBe(false);
	});

	it("allows legacy content write to satisfy granular read", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["content:write"],
				required: ["pages:read"],
			}),
		).toBe(true);
	});

	it("denies missing scopes", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["posts:read"],
				required: ["posts:write"],
			}),
		).toBe(false);
	});

	it("requires at least one scope for identity-only routes", () => {
		expect(apiKeyScopesAllow({ granted: [], required: [] })).toBe(false);
		expect(apiKeyScopesAllow({ granted: ["posts:read"], required: [] })).toBe(true);
	});

	it("denies partial keys on full-access routes", () => {
		expect(
			apiKeyScopesAllow({
				granted: ["posts:read"],
				required: [...API_KEY_SCOPE_CATALOG.map((entry) => entry.id)],
			}),
		).toBe(false);
	});
});

describe("formatApiKeyScopeLabel", () => {
	it("returns catalog label for known scopes", () => {
		expect(formatApiKeyScopeLabel("posts:read")).toBe("View posts");
	});

	it("labels legacy scopes", () => {
		expect(formatApiKeyScopeLabel("content:read")).toBe("Read all content (legacy)");
	});

	it("falls back to raw id for unknown scopes", () => {
		expect(formatApiKeyScopeLabel("custom:scope")).toBe("custom:scope");
	});
});

describe("catalog coverage", () => {
	it("catalog includes every non-legacy canonical scope id", () => {
		const catalogIds = new Set(API_KEY_SCOPE_CATALOG.map((entry) => entry.id));
		for (const scopeId of API_KEY_SCOPE_IDS) {
			if (scopeId.startsWith("content:")) {
				continue;
			}
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
		).toEqual(["pages:read"]);
	});

	it("allows any scoped key for auth identity", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/auth/user" }),
		).toEqual([]);
	});

	it("requires pages read for page list GET", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/pages" }),
		).toEqual(["pages:read"]);
	});

	it("requires posts write for post create POST", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/posts" }),
		).toEqual(["posts:write"]);
	});

	it("requires blogs write for blog delete", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "DELETE", path: "/api/blogs/abc" }),
		).toEqual(["blogs:write"]);
	});

	it("requires preview write for share token mint", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "POST", path: "/api/preview/tokens" }),
		).toEqual(["preview:write"]);
	});

	it("requires matching resource read for authenticated preview GET", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/preview/post/abc" }),
		).toEqual(["posts:read"]);
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

	it("requires dashboard read for dashboard stats", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/dashboard/stats" }),
		).toEqual(["dashboard:read"]);
	});

	it("requires full access for unmapped api routes", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/api/future-endpoint" }),
		).toEqual([...API_KEY_SCOPE_CATALOG.map((entry) => entry.id)]);
	});

	it("returns null for non-api paths", () => {
		expect(
			resolveRequiredApiKeyScopes({ method: "GET", path: "/admin/settings" }),
		).toBeNull();
	});
});

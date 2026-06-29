import { describe, it, expect } from "vitest";
import {
	expandSiteUrlOrigins,
	getRequestSelfOrigin,
} from "../../server/lib/origin-utils";

/** Builds a web Request carrying the given headers (host/origin survive on Node). */
const makeRequest = (headers: Record<string, string>): Request =>
	new Request("http://app:5000/api/auth/sign-in/email", {
		method: "POST",
		headers,
	});

describe("getRequestSelfOrigin", () => {
	it("trusts a legitimate same-origin request (Origin host === Host)", () => {
		const req = makeRequest({
			origin: "https://example.com",
			host: "example.com",
		});
		expect(getRequestSelfOrigin(req)).toBe("https://example.com");
	});

	it("rejects a cross-site forgery (Origin host !== Host)", () => {
		const req = makeRequest({
			origin: "https://attacker.com",
			host: "example.com",
		});
		expect(getRequestSelfOrigin(req)).toBeNull();
	});

	it("returns null when no Origin header is present", () => {
		const req = makeRequest({ host: "example.com" });
		expect(getRequestSelfOrigin(req)).toBeNull();
	});

	it("returns null for a malformed Origin header", () => {
		const req = makeRequest({ origin: "not-a-url", host: "example.com" });
		expect(getRequestSelfOrigin(req)).toBeNull();
	});

	it("falls back to X-Forwarded-Host when Host is absent", () => {
		const req = makeRequest({
			origin: "https://example.com",
			"x-forwarded-host": "example.com",
		});
		expect(getRequestSelfOrigin(req)).toBe("https://example.com");
	});

	it("matches host:port origins", () => {
		const req = makeRequest({
			origin: "https://example.com:8443",
			host: "example.com:8443",
		});
		expect(getRequestSelfOrigin(req)).toBe("https://example.com:8443");
	});

	it("matches case-insensitively on host", () => {
		const req = makeRequest({
			origin: "https://Example.COM",
			host: "example.com",
		});
		expect(getRequestSelfOrigin(req)).toBe("https://example.com");
	});

	it("trusts http origins when same-origin (local / IP access)", () => {
		const req = makeRequest({
			origin: "http://192.168.1.10",
			host: "192.168.1.10",
		});
		expect(getRequestSelfOrigin(req)).toBe("http://192.168.1.10");
	});
});

describe("expandSiteUrlOrigins", () => {
	it("expands a public domain to both schemes for apex and www", () => {
		const origins = expandSiteUrlOrigins("https://example.com");
		expect(new Set(origins)).toEqual(
			new Set([
				"https://example.com",
				"http://example.com",
				"https://www.example.com",
				"http://www.example.com",
			]),
		);
	});

	it("is scheme-agnostic: a stored http URL still trusts https", () => {
		const origins = expandSiteUrlOrigins("http://example.com");
		expect(origins).toContain("https://example.com");
		expect(origins).toContain("https://www.example.com");
	});

	it("handles a www-prefixed stored URL", () => {
		const origins = expandSiteUrlOrigins("https://www.shop.io");
		expect(origins).toContain("https://shop.io");
		expect(origins).toContain("https://www.shop.io");
	});

	it("expands a bare hostname without a scheme", () => {
		const origins = expandSiteUrlOrigins("example.com");
		expect(origins).toContain("https://example.com");
		expect(origins).toContain("http://example.com");
	});

	it("returns an empty list for blank input", () => {
		expect(expandSiteUrlOrigins("   ")).toEqual([]);
	});
});

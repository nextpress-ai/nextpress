import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
	it("strips unquoted event handlers that quoted-only regex missed", () => {
		const dirty = `<img src=x onerror=alert(1)><p onclick=alert(2)>x</p>`;
		const clean = sanitizeHtml(dirty);
		expect(clean).not.toMatch(/onerror/i);
		expect(clean).not.toMatch(/onclick/i);
	});

	it("still strips quoted handlers and script", () => {
		const dirty = `<script>alert(1)</script><div onclick="alert(2)">ok</div>`;
		const clean = sanitizeHtml(dirty);
		expect(clean).not.toMatch(/script/i);
		expect(clean).not.toMatch(/onclick/i);
		expect(clean).toContain("ok");
	});
});

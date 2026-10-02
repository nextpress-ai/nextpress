import { describe, expect, it } from "vitest";
import { optimizePublishedDocument } from "./published-document-speed.js";

const page = (body: string): string =>
	`<!DOCTYPE html><html><head><title>T</title></head><body>${body}</body></html>`;

describe("optimizePublishedDocument", () => {
	it("starts the first picture early and waits on pictures further down", () => {
		const html = optimizePublishedDocument(
			page(
				[
					'<img src="/uploads/hero.jpg" alt="Hero">',
					'<img src="/uploads/two.jpg" alt="">',
					'<img src="/uploads/three.jpg" alt="">',
					'<img src="/uploads/four.jpg" alt="">',
					'<iframe src="https://example.com/embed"></iframe>',
					'<iframe src="https://example.com/later"></iframe>',
				].join(""),
			),
		);

		expect(html).toContain(
			'<link rel="preload" as="image" href="/uploads/hero.jpg" fetchpriority="high">',
		);
		expect(html).toContain('<img src="/uploads/hero.jpg" alt="Hero" decoding="async" fetchpriority="high">');
		expect(html).not.toMatch(/two\.jpg"[^>]*loading="lazy"/);
		expect(html).toContain('src="/uploads/four.jpg" alt="" decoding="async" loading="lazy" fetchpriority="low"');
		expect(html).toContain('<iframe src="https://example.com/later" loading="lazy">');
		expect(html).toContain('type="speculationrules"');
		expect(html).toContain('"/admin/*"');
		expect(html).toContain("pointerover");
	});

	it("leaves a picture's own loading choice alone", () => {
		const html = optimizePublishedDocument(page('<img src="/a.jpg" alt="" loading="eager"><img src="/b.jpg"><img src="/c.jpg"><img src="/d.jpg" loading="eager">'));
		expect(html).toContain('src="/d.jpg" loading="eager"');
	});
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyHeaderVariant, DEFAULT_HEADER_CONTENT, type HeaderVariant } from "./header-model";
import { HeaderBar } from "./header-view";

const markup = (variant: HeaderVariant, blocks?: React.ReactNode): string =>
	renderToStaticMarkup(
		<HeaderBar content={applyHeaderVariant(DEFAULT_HEADER_CONTENT, variant)} blocks={blocks} />,
	);

describe("HeaderBar menu button", () => {
	it("keeps the menu for layouts with links", () => {
		for (const variant of ["links-and-actions", "links-only", "split"] as const) {
			const html = markup(variant);
			expect(html).toContain("wp-block-header__mobile-panel");
			expect(html).toContain("wp-block-header__burger");
			expect(html).not.toContain("is-no-menu");
		}
	});

	it("has no menu button at all for buttons-only and blocks layouts", () => {
		for (const variant of ["actions-only", "brand-and-blocks"] as const) {
			const html = markup(variant);
			expect(html).not.toContain("wp-block-header__mobile-panel");
			expect(html).not.toContain("wp-block-header__burger");
			expect(html).not.toContain("Open menu");
			expect(html).toContain("is-no-menu");
		}
	});
});

describe("HeaderBar blocks layout", () => {
	it("paints the given blocks in the right slot, and no built-in links or buttons", () => {
		const html = markup(
			"brand-and-blocks",
			<div className="wp-block-header__blocks">
				<button>Contact us</button>
				<span>Second block</span>
			</div>,
		);
		const right = html.slice(html.indexOf("wp-block-header__slot is-right"));
		expect(right).toContain("Contact us");
		expect(right).toContain("Second block");
		expect(html).not.toContain("wp-block-header__nav");
		expect(html).not.toContain("wp-block-header__actions");
	});

	it("ignores blocks in layouts that do not have the blocks area", () => {
		const html = markup("links-and-actions", <b>stray block</b>);
		expect(html).not.toContain("stray block");
	});

	it("keeps buttons-only visible on the right without a menu", () => {
		const html = markup("actions-only");
		const right = html.slice(html.indexOf("wp-block-header__slot is-right"));
		expect(right).toContain("wp-block-header__actions");
		expect(right).toContain("Sign in");
	});
});

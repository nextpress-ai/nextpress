import { describe, expect, it } from "vitest";
import {
	applyHeaderVariant,
	DEFAULT_HEADER_CONTENT,
	HEADER_PLACEHOLDERS,
	headerBarClassName,
	headerOverlayPaintStyles,
	applyHeaderBrandKind,
	headerActionLookStyle,
	headerLogoMarkStyle,
	nextHeaderActionStyle,
	readHeaderContent,
	resolveHeaderHref,
	slotsForHeaderVariant,
	visibleHeaderSlots,
} from "./header-model";

describe("header variants", () => {
	it("maps the four shot layouts to slots", () => {
		expect(slotsForHeaderVariant("links-and-actions")).toEqual({
			showNav: true,
			showActions: true,
			brandSlot: "left",
			navSlot: "right",
			actionsSlot: "right",
		});
		expect(slotsForHeaderVariant("links-only").showActions).toBe(false);
		expect(slotsForHeaderVariant("split").navSlot).toBe("middle");
		expect(slotsForHeaderVariant("actions-only").showNav).toBe(false);
	});

	it("places brand, nav, and actions for each variant", () => {
		const split = visibleHeaderSlots(applyHeaderVariant(DEFAULT_HEADER_CONTENT, "split"));
		expect(split.left).toEqual(["brand"]);
		expect(split.middle).toEqual(["nav"]);
		expect(split.right).toEqual(["actions"]);

		const links = visibleHeaderSlots(
			applyHeaderVariant(DEFAULT_HEADER_CONTENT, "links-and-actions"),
		);
		expect(links.right).toEqual(["nav", "actions"]);
	});
});

describe("header content", () => {
	it("defaults and keeps sticky off unless set", () => {
		const parsed = readHeaderContent({ kind: "structured", data: {} });
		expect(parsed.brand.text).toBe("Site");
		expect(parsed.nav.length).toBeGreaterThan(0);
		expect(parsed.sticky).toBe(false);
		expect(headerBarClassName({ sticky: true })).toBe("wp-block-header is-sticky");
	});

	it("raises overlay paint so an open menu sits above later siblings", () => {
		expect(headerOverlayPaintStyles({ name: "core/header" })).toEqual({
			position: "relative",
			zIndex: 40,
		});
		expect(headerOverlayPaintStyles({ name: "core/heading" })).toEqual({});
	});

	it("clears logo URL when switching back to wordmark", () => {
		const logoBrand = applyHeaderBrandKind(
			{ kind: "logo", text: "Site", href: "/", logoUrl: "https://example.com/logo.svg" },
			"wordmark",
		);
		expect(logoBrand.kind).toBe("wordmark");
		expect(logoBrand.logoUrl).toBeUndefined();
		expect(logoBrand.logoSize).toBe("1.75rem");
		expect(logoBrand.logoRadius).toBe("0");
		expect(readHeaderContent({
			kind: "structured",
			data: {
				brand: { kind: "wordmark", text: "Site", logoUrl: "https://example.com/logo.svg" },
			},
		}).brand.logoUrl).toBeUndefined();
	});

	it("applies logo size and circle crop from brand look", () => {
		const parsed = readHeaderContent({
			kind: "structured",
			data: {
				brand: { kind: "logo", text: "Site", logoSize: "2.25rem", logoRadius: "50%" },
			},
		});
		expect(parsed.brand.logoSize).toBe("2.25rem");
		expect(parsed.brand.logoRadius).toBe("50%");
		expect(headerLogoMarkStyle(parsed.brand)).toEqual({
			height: "2.25rem",
			width: "2.25rem",
			borderRadius: "50%",
			objectFit: "cover",
		});
	});

	it("sizes and paints header buttons from look presets", () => {
		const parsed = readHeaderContent({
			kind: "structured",
			data: {
				actions: [
					{
						id: "action-1",
						label: "Go",
						href: "/go",
						style: "solid",
						size: "lg",
						radius: "0.375rem",
						color: { property: "backgroundColor", value: "blue", variant: "600", alias: "bg", style: "#2563eb" },
					},
				],
			},
		});
		expect(parsed.actions[0]?.size).toBe("lg");
		expect(headerActionLookStyle(parsed.actions[0]!)).toMatchObject({
			minHeight: "2.25rem",
			borderRadius: "0.375rem",
			backgroundColor: "#2563eb",
			color: "#fff",
		});
	});

	it("uses real paths and a quiet-then-solid button pair", () => {
		expect(DEFAULT_HEADER_CONTENT.nav[0]?.href).toBe("/products");
		expect(DEFAULT_HEADER_CONTENT.nav[1]?.href).toBe("/about");
		expect(DEFAULT_HEADER_CONTENT.actions.map((action) => action.style)).toEqual([
			"ghost",
			"solid",
		]);
		expect(nextHeaderActionStyle([])).toBe("ghost");
		expect(nextHeaderActionStyle(DEFAULT_HEADER_CONTENT.actions)).toBe("ghost");
		expect(nextHeaderActionStyle([DEFAULT_HEADER_CONTENT.actions[0]!])).toBe("solid");
	});

	it("strips hash hrefs on read and never paints them", () => {
		const parsed = readHeaderContent({
			kind: "structured",
			data: {
				nav: [{ id: "nav-1", label: "Old", href: "#" }],
				actions: [{ id: "action-1", label: "Old", href: "#", style: "ghost" }],
			},
		});
		expect(parsed.nav[0]?.href).toBe("");
		expect(parsed.actions[0]?.href).toBe("");
		expect(
			resolveHeaderHref("#", HEADER_PLACEHOLDERS.linkHref),
		).toBe(HEADER_PLACEHOLDERS.linkHref);
	});

	it("uses the same nav and actions for mobile as desktop", () => {
		const content = readHeaderContent({
			kind: "structured",
			data: DEFAULT_HEADER_CONTENT,
		});
		expect(content.nav).toEqual(DEFAULT_HEADER_CONTENT.nav);
		expect(content.actions).toEqual(DEFAULT_HEADER_CONTENT.actions);
	});
});

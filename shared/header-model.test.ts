import { describe, expect, it } from "vitest";
import {
	applyHeaderVariant,
	DEFAULT_HEADER_CONTENT,
	HEADER_PLACEHOLDERS,
	headerBarClassName,
	headerOverlayPaintStyles,
	applyHeaderBrandKind,
	headerActionLookStyle,
	headerActionSizeLook,
	headerCollapsesToMenu,
	headerHasBlocksSlot,
	HEADER_VARIANT_OPTIONS,
	headerLogoMarkStyle,
	nextHeaderActionStyle,
	readHeaderContent,
	resolveHeaderHref,
	slotsForHeaderVariant,
	visibleHeaderSlots,
} from "./header-model";

describe("header variants", () => {
	it("maps the five layouts to slots", () => {
		expect(slotsForHeaderVariant("links-and-actions")).toEqual({
			showNav: true,
			showActions: true,
			showBlocks: false,
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
			{
				kind: "logo",
				text: "Site",
				href: "/",
				logoUrl: "https://example.com/logo.svg",
				logoSize: "1.75rem",
				logoRadius: "0",
				showName: false,
			},
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

describe("header logo look", () => {
	it("keeps a custom logo size and corners when switching to wordmark and back", () => {
		const customLogo = {
			kind: "logo" as const,
			text: "Site",
			href: "/",
			logoUrl: "https://example.com/logo.svg",
			logoSize: "3.5rem",
			logoRadius: "14px",
			showName: true,
		};
		const asWordmark = applyHeaderBrandKind(customLogo, "wordmark");
		expect(asWordmark.logoUrl).toBeUndefined();
		expect(asWordmark.logoSize).toBe("3.5rem");
		expect(asWordmark.logoRadius).toBe("14px");
		expect(applyHeaderBrandKind(asWordmark, "logo")).toMatchObject({
			logoSize: "3.5rem",
			logoRadius: "14px",
		});
	});
});

describe("header button size", () => {
	const readSize = (size: unknown) =>
		readHeaderContent({
			kind: "structured",
			data: {
				actions: [{ id: "a", label: "Go", href: "/go", style: "solid", size }],
			},
		}).actions[0]!.size;

	it("keeps preset names exactly as before", () => {
		expect(headerActionSizeLook("sm")).toEqual({
			minHeight: "1.5rem",
			padding: "0.2rem 0.65rem",
			fontSize: "0.6875rem",
		});
		expect(headerActionSizeLook("xl").minHeight).toBe("2.75rem");
	});

	it("accepts a custom font size and scales height and padding from it", () => {
		expect(readSize("0.95rem")).toBe("0.95rem");
		expect(headerActionSizeLook("0.95rem")).toEqual({
			fontSize: "0.95rem",
			minHeight: "2.33em",
			padding: "0.4em 1.07em",
		});
	});

	it("keeps unfinished typing in the saved value but paints it as MD", () => {
		expect(readSize("0.")).toBe("0.");
		expect(headerActionSizeLook("0.")).toEqual(headerActionSizeLook("md"));
		expect(headerActionSizeLook("big")).toEqual(headerActionSizeLook("md"));
	});

	it("falls back to MD when the size is missing or blank", () => {
		expect(readSize(undefined)).toBe("md");
		expect(readSize("   ")).toBe("md");
		expect(readSize(42)).toBe("md");
	});

	it("paints a custom size with the button color rules unchanged", () => {
		const look = headerActionLookStyle({
			id: "a",
			label: "Go",
			href: "/go",
			style: "solid",
			size: "1rem",
			radius: "12px",
			color: { property: "backgroundColor", value: "", variant: null, alias: "bg", style: "#111111" },
		});
		expect(look).toMatchObject({
			fontSize: "1rem",
			borderRadius: "12px",
			backgroundColor: "#111111",
			color: "#fff",
		});
	});
});

describe("header blocks layout and menu rules", () => {
	it("lists the blocks layout and knows it holds child blocks", () => {
		expect(HEADER_VARIANT_OPTIONS.map((option) => option.value)).toContain("brand-and-blocks");
		expect(headerHasBlocksSlot("brand-and-blocks")).toBe(true);
		for (const variant of ["links-and-actions", "links-only", "split", "actions-only"] as const) {
			expect(headerHasBlocksSlot(variant)).toBe(false);
		}
	});

	it("only folds into a menu when the layout has links", () => {
		expect(headerCollapsesToMenu("links-and-actions")).toBe(true);
		expect(headerCollapsesToMenu("links-only")).toBe(true);
		expect(headerCollapsesToMenu("split")).toBe(true);
		expect(headerCollapsesToMenu("actions-only")).toBe(false);
		expect(headerCollapsesToMenu("brand-and-blocks")).toBe(false);
	});

	it("paints only brand and the blocks area in the blocks layout", () => {
		const content = applyHeaderVariant(DEFAULT_HEADER_CONTENT, "brand-and-blocks");
		expect(visibleHeaderSlots(content)).toEqual({ left: ["brand"], middle: [], right: ["blocks"] });
		expect(slotsForHeaderVariant("brand-and-blocks")).toMatchObject({
			showNav: false,
			showActions: false,
			showBlocks: true,
		});
	});

	it("keeps the existing layouts exactly as before", () => {
		expect(visibleHeaderSlots(applyHeaderVariant(DEFAULT_HEADER_CONTENT, "split"))).toEqual({
			left: ["brand"],
			middle: ["nav"],
			right: ["actions"],
		});
		expect(visibleHeaderSlots(applyHeaderVariant(DEFAULT_HEADER_CONTENT, "actions-only"))).toEqual({
			left: ["brand"],
			middle: [],
			right: ["actions"],
		});
	});

	it("marks no-menu layouts in the class name and leaves the rest alone", () => {
		expect(headerBarClassName({ sticky: false, variant: "actions-only" })).toBe(
			"wp-block-header is-no-menu",
		);
		expect(headerBarClassName({ sticky: true, variant: "brand-and-blocks" })).toBe(
			"wp-block-header is-sticky is-no-menu",
		);
		expect(headerBarClassName({ sticky: false, variant: "split" })).toBe("wp-block-header");
		expect(headerBarClassName({ sticky: true })).toBe("wp-block-header is-sticky");
	});

	it("reads a saved blocks layout back and rejects unknown layout names", () => {
		const read = (variant: string) =>
			readHeaderContent({ kind: "structured", data: { variant } }).variant;
		expect(read("brand-and-blocks")).toBe("brand-and-blocks");
		expect(read("nonsense")).toBe("links-and-actions");
	});
});

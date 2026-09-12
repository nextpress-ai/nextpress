import { describe, expect, it } from "vitest";
import {
	applyHeaderVariant,
	DEFAULT_HEADER_CONTENT,
	headerBarClassName,
	readHeaderContent,
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

	it("uses the same nav and actions for mobile as desktop", () => {
		const content = readHeaderContent({
			kind: "structured",
			data: DEFAULT_HEADER_CONTENT,
		});
		expect(content.nav).toEqual(DEFAULT_HEADER_CONTENT.nav);
		expect(content.actions).toEqual(DEFAULT_HEADER_CONTENT.actions);
	});
});

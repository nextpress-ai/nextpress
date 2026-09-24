import { describe, expect, it } from "vitest";
import { buildStackShellStyles } from "@shared/stack-shell-styles";
import { readStackTypeFromContent } from "@shared/stack-model";
import { getOverlayChildItemStyles } from "@shared/block-container-placement";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";
import { parentAllowsChildPin } from "@shared/auto-layout-model";
import { buildLayoutSignature } from "@shared/layout-signature";
import type { BlockConfig, BlockContent } from "@shared/schema-types";

const structured = (data: Record<string, unknown>) =>
	({ kind: "structured", data }) as unknown as BlockContent;

const stackBlock = (partial: Partial<BlockConfig> & { id: string }): BlockConfig => ({
	name: "core/stack",
	type: "container",
	parentId: null,
	content: structured({ stackType: "vertical" }),
	styles: {},
	settings: {},
	...partial,
});

describe("stack model", () => {
	it("falls back to vertical for missing or unknown modes", () => {
		expect(readStackTypeFromContent(undefined)).toBe("vertical");
		expect(readStackTypeFromContent(structured({}))).toBe("vertical");
		expect(readStackTypeFromContent(structured({ stackType: "diagonal" }))).toBe("vertical");
		expect(readStackTypeFromContent(structured({ stackType: "overlay" }))).toBe("overlay");
	});
});

describe("stack shell styles", () => {
	it("vertical stack reads flex settings from styles", () => {
		const { outerStyle, innerStackStyle, isHorizontal, isOverlay } = buildStackShellStyles({
			styles: { display: "flex", flexDirection: "column", gap: "1rem" },
			content: structured({ stackType: "vertical" }),
		});
		expect(innerStackStyle.display).toBe("flex");
		expect(innerStackStyle.flexDirection).toBe("column");
		expect(innerStackStyle.gap).toBe("1rem");
		expect(isHorizontal).toBe(false);
		expect(isOverlay).toBe(false);
		expect(outerStyle.display).toBeUndefined();
	});

	it("mode wins over stale style direction", () => {
		const { innerStackStyle } = buildStackShellStyles({
			styles: { display: "flex", flexDirection: "row" },
			content: structured({ stackType: "vertical" }),
		});
		expect(innerStackStyle.flexDirection).toBe("column");
	});

	it("horizontal stack defaults to wrap + centered children", () => {
		const { innerStackStyle, isHorizontal } = buildStackShellStyles({
			styles: {},
			content: structured({ stackType: "horizontal" }),
		});
		expect(isHorizontal).toBe(true);
		expect(innerStackStyle.flexDirection).toBe("row");
		expect(innerStackStyle.flexWrap).toBe("wrap");
		expect(innerStackStyle.alignItems).toBe("center");
	});

	it("horizontal stack honors explicit align and reverse", () => {
		const { innerStackStyle } = buildStackShellStyles({
			styles: { flexDirection: "row-reverse", alignItems: "flex-start" },
			content: structured({ stackType: "horizontal" }),
		});
		expect(innerStackStyle.flexDirection).toBe("row-reverse");
		expect(innerStackStyle.alignItems).toBe("flex-start");
	});

	it("overlay stack is a single grid cell and ignores gap", () => {
		const { innerStackStyle, isOverlay } = buildStackShellStyles({
			styles: { gap: "1rem" },
			content: structured({ stackType: "overlay" }),
		});
		expect(isOverlay).toBe(true);
		expect(innerStackStyle.display).toBe("grid");
		expect(innerStackStyle.gap).toBeUndefined();
		expect(innerStackStyle.gridTemplateColumns).toBeUndefined();
	});
});

describe("overlay child item styles", () => {
	it("shares cell 1/1 and stretches when unpinned", () => {
		const styles = getOverlayChildItemStyles({});
		expect(styles.gridArea).toBe("1 / 1");
		expect(styles.justifySelf).toBeUndefined();
		expect(styles.alignSelf).toBeUndefined();
	});

	it("maps pins to grid-native self alignment", () => {
		const styles = getOverlayChildItemStyles({
			contentAlignHorizontal: "right",
			contentAlignVertical: "bottom",
		});
		expect(styles.justifySelf).toBe("end");
		expect(styles.alignSelf).toBe("end");
	});
});

describe("pancake shrink (flex 0 1 <width>)", () => {
	it("keeps legacy fixed children unshrinkable by default", () => {
		const styles = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "320px" },
		});
		expect(styles.flexGrow).toBe("0");
		expect(styles.flexShrink).toBe("0");
		expect(styles.flexBasis).toBe("320px");
	});

	it("shrinks a fixed child when requested", () => {
		const styles = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "320px" },
			shrink: true,
		});
		expect(styles.flexGrow).toBe("0");
		expect(styles.flexShrink).toBe("1");
		expect(styles.flexBasis).toBe("320px");
		expect(styles.width).toBe("320px");
	});
});

describe("stack integration", () => {
	it("stack parents allow child pinning", () => {
		expect(parentAllowsChildPin({ name: "core/stack", styles: {}, content: {} })).toBe(true);
	});

	it("signature carries pancake shrink through the child wrapper", () => {
		const block = stackBlock({
			id: "stack-1",
			styles: { display: "flex", flexDirection: "row", flexWrap: "wrap" },
			children: [
				{
					id: "a",
					name: "core/heading",
					type: "block",
					parentId: "stack-1",
					content: { kind: "text", value: "A" },
					styles: { width: "240px" },
					settings: { stackShrink: true },
				} as BlockConfig,
			],
		});
		const signature = buildLayoutSignature(block);
		expect(signature.flexDirection).toBe("row");
		expect(signature.children[0]?.wrapper.flexShrink).toBe("1");
		expect(signature.children[0]?.wrapper.flexBasis).toBe("240px");
	});
});

const image = (styles: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => ({
	name: "core/image",
	styles,
	content: { kind: "media", mediaType: "image", url: "/a.png", ...content },
});
const heading = (styles: Record<string, unknown> = {}) => ({ name: "core/heading", styles, content: {} });
const overlayContent = structured({ stackType: "overlay" });

describe("overlay stack hugs a first-layer image", () => {
	it("fixed-size image first: column hugs it, left by default", () => {
		const result = buildStackShellStyles({
			styles: {},
			content: overlayContent,
			children: [image({ width: "240px" }), heading()],
		});
		expect(result.overlayHugsBase).toBe(true);
		expect(result.innerStackStyle.justifyContent).toBe("start");
	});

	it("follows the image's own centre / right pin", () => {
		const centre = buildStackShellStyles({
			styles: {},
			content: overlayContent,
			children: [image({ contentAlignHorizontal: "center" }), heading()],
		});
		const right = buildStackShellStyles({
			styles: {},
			content: overlayContent,
			children: [image({}, { align: "right" }), heading()],
		});
		expect(centre.innerStackStyle.justifyContent).toBe("center");
		expect(right.innerStackStyle.justifyContent).toBe("end");
	});

	it("keeps filling the stack for full / wide / percentage-width images", () => {
		for (const child of [
			image({}, { align: "full" }),
			image({}, { align: "wide" }),
			image({ width: "100%" }),
			image({}, { width: "80%" }),
		]) {
			const result = buildStackShellStyles({
				styles: {},
				content: overlayContent,
				children: [child, heading()],
			});
			expect(result.overlayHugsBase).toBe(false);
			expect(result.innerStackStyle.justifyContent).toBeUndefined();
		}
	});

	it("does nothing when the first layer is not an image", () => {
		const result = buildStackShellStyles({
			styles: {},
			content: overlayContent,
			children: [heading(), image({ width: "240px" })],
		});
		expect(result.overlayHugsBase).toBe(false);
	});

	it("vertical stacks never hug", () => {
		const result = buildStackShellStyles({
			styles: {},
			content: structured({ stackType: "vertical" }),
			children: [image({ width: "240px" }), heading()],
		});
		expect(result.overlayHugsBase).toBe(false);
	});
});

describe("overlay layers held to the image width", () => {
	it("adds no width of its own to the column", () => {
		const styles = getOverlayChildItemStyles({}, { heldToBase: true });
		expect(styles.contain).toBe("inline-size");
		expect(styles.justifySelf).toBeUndefined();
	});

	it("moves a centre / right pin inside the column instead of shrinking the layer", () => {
		const centre = getOverlayChildItemStyles({ contentAlignHorizontal: "center" }, { heldToBase: true });
		const right = getOverlayChildItemStyles({ contentAlignHorizontal: "right" }, { heldToBase: true });
		expect(centre.display).toBe("flex");
		expect(centre.justifyContent).toBe("center");
		expect(right.justifyContent).toBe("flex-end");
		expect(centre.justifySelf).toBeUndefined();
	});

	it("still honors vertical pins", () => {
		const styles = getOverlayChildItemStyles({ contentAlignVertical: "bottom" }, { heldToBase: true });
		expect(styles.alignSelf).toBe("end");
	});

	it("leaves other overlays exactly as before", () => {
		const styles = getOverlayChildItemStyles({ contentAlignHorizontal: "center" });
		expect(styles.contain).toBeUndefined();
		expect(styles.justifySelf).toBe("center");
	});
});

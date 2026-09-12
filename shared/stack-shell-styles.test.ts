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

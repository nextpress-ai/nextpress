import { describe, expect, it } from "vitest";
import { INSERTED_BLOCK_BASE_STYLES } from "../block-catalog/create-default-block.js";
import type { BlockConfig } from "../schema-types.js";
import { fitToDocsColumn } from "./docs-column-spacing.js";

const block = (padding: string, children?: BlockConfig[]): BlockConfig => ({
	id: `b-${padding}`,
	name: "core/code",
	label: "Code",
	type: "block",
	parentId: null,
	content: { kind: "structured", data: {} },
	styles: { padding, margin: "0" },
	...(children ? { children } : {}),
});

describe("blocks in a docs page line up with its text", () => {
	it("drops the sides of the starting padding and keeps its top, for the block and the blocks in it", () => {
		const fitted = fitToDocsColumn(block(INSERTED_BLOCK_BASE_STYLES.padding, [block(INSERTED_BLOCK_BASE_STYLES.padding)]));
		expect(fitted.styles?.padding).toBe("20px 0 0");
		expect(fitted.children?.[0].styles?.padding).toBe("20px 0 0");
		expect(fitted.styles?.margin).toBe("0");
	});

	it("leaves a padding someone chose", () => {
		expect(fitToDocsColumn(block("32px")).styles?.padding).toBe("32px");
	});
});

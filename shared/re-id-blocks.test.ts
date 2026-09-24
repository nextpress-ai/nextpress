import { describe, expect, it } from "vitest";
import { reIdBlocks } from "./re-id-blocks";
import type { BlockConfig } from "./schema-types";

const block = (id: string, children?: BlockConfig[]): BlockConfig => ({
	id,
	name: "core/group",
	type: "container",
	parentId: null,
	content: { kind: "structured", data: {} },
	children,
});

describe("reIdBlocks", () => {
	it("gives every block a new id and points children at the new parent", () => {
		let n = 0;
		const copy = reIdBlocks({
			blocks: [block("shell", [block("header"), block("hero")])],
			generateId: () => `new-${(n += 1)}`,
		});
		expect(copy[0]?.id).toBe("new-1");
		expect(copy[0]?.parentId).toBeNull();
		expect(copy[0]?.children?.map((child) => child.id)).toEqual(["new-2", "new-3"]);
		expect(copy[0]?.children?.every((child) => child.parentId === "new-1")).toBe(true);
		expect(copy[0]?.children?.some((child) => child.id === "header")).toBe(false);
	});
});

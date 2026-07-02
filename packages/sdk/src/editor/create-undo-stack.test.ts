import { describe, expect, it } from "vitest";
import { createUndoStack } from "./create-undo-stack.js";

describe("createUndoStack", () => {
	it("pushes, undoes, and redoes block snapshots", () => {
		const stack = createUndoStack<string[]>([["a"]]);
		stack.pushState(["a", "b"]);
		stack.pushState(["a", "b", "c"]);

		expect(stack.getState()).toEqual(["a", "b", "c"]);
		expect(stack.canUndo()).toBe(true);

		stack.undo();
		expect(stack.getState()).toEqual(["a", "b"]);

		stack.redo();
		expect(stack.getState()).toEqual(["a", "b", "c"]);
	});

	it("replaces current state for coalesced edits", () => {
		const stack = createUndoStack("hello");
		stack.replaceCurrentState("hello world");
		expect(stack.getState()).toBe("hello world");
		expect(stack.canUndo()).toBe(false);
	});
});

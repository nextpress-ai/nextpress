import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUndoRedo } from "@/hooks/useUndoRedo";

describe("useUndoRedo", () => {
	it("returns the restored snapshot so callers can sync save and preview", () => {
		const { result } = renderHook(() => useUndoRedo(["full"]));

		act(() => {
			result.current.pushState(["empty"]);
		});
		expect(result.current.currentState).toEqual(["empty"]);

		const onBlocksChange = vi.fn();
		act(() => {
			const next = result.current.undo();
			if (next) onBlocksChange(next);
		});

		expect(result.current.currentState).toEqual(["full"]);
		expect(onBlocksChange).toHaveBeenCalledWith(["full"]);
	});

	it("returns undefined when there is nothing to undo", () => {
		const { result } = renderHook(() => useUndoRedo("only"));
		let landed: string | undefined = "sentinel";
		act(() => {
			landed = result.current.undo();
		});
		expect(landed).toBeUndefined();
		expect(result.current.currentState).toBe("only");
	});

	it("redo returns the snapshot it lands on", () => {
		const { result } = renderHook(() => useUndoRedo("a"));
		act(() => {
			result.current.pushState("b");
		});
		act(() => {
			result.current.undo();
		});
		let landed: string | undefined;
		act(() => {
			landed = result.current.redo();
		});
		expect(landed).toBe("b");
		expect(result.current.currentState).toBe("b");
	});
});

import { describe, expect, it, vi } from "vitest";
import { pickMutatedEntityResult, runEventHandlers } from "./event-context.js";

describe("runEventHandlers", () => {
	it("exposes contextual set on the subject entity", () => {
		const first = vi.fn(({ post }: { post: { title: string; set: (patch: unknown) => void } }) => {
			post.set({ title: `${post.title} [first]` });
			expect(post.title).toBe("Hello [first]");
		});
		const second = vi.fn(({ post }: { post: { title: string } }) => {
			expect(post.title).toBe("Hello [first]");
		});

		const finalPayload = runEventHandlers(
			{ post: { title: "Hello" }, action: "created" as const },
			new Set([first, second]),
		);

		expect(finalPayload.post.title).toBe("Hello [first]");
		expect(second).toHaveBeenCalledOnce();
	});

	it("returns the original payload when no handler calls set", () => {
		const observer = vi.fn(({ page }: { page: { title: string; set: (patch: unknown) => void } }) => {
			expect(page.set).toBeTypeOf("function");
		});
		const payload = { page: { title: "Hello" } };

		const finalPayload = runEventHandlers(payload, new Set([observer]));

		expect(finalPayload).toEqual(payload);
		expect(observer).toHaveBeenCalledOnce();
	});
});

describe("pickMutatedEntityResult", () => {
	it("prefers mutated entity fields from the event payload", () => {
		const mutated = { id: "p1", title: "Mutated" };
		const result = pickMutatedEntityResult({ id: "p1", title: "Original" }, { post: mutated });

		expect(result).toBe(mutated);
	});
});

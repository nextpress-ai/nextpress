import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "./create-event-bus.js";

describe("createEventBus", () => {
	it("delivers typed payloads to on handlers", () => {
		const bus = createEventBus();
		const handler = vi.fn();

		bus.on("post-saved", handler);
		bus.emit("post-saved", {
			post: { id: "p1", title: "Hi", slug: "hi", status: "draft", blogId: "b1", authorId: "u1" },
			action: "created",
		});

		expect(handler).toHaveBeenCalledOnce();
		expect(handler.mock.calls[0][0].post.id).toBe("p1");
	});

	it("unsubscribes via returned function and off", () => {
		const bus = createEventBus();
		const handler = vi.fn();
		const unsubscribe = bus.on("page-created", handler);

		unsubscribe();
		bus.emit("page-created", {
			page: { id: "pg1", title: "Page", slug: "page", status: "draft", siteId: "s1" },
		});
		expect(handler).not.toHaveBeenCalled();

		bus.on("page-created", handler);
		bus.off("page-created", handler);
		bus.emit("page-created", {
			page: { id: "pg1", title: "Page", slug: "page", status: "draft", siteId: "s1" },
		});
		expect(handler).not.toHaveBeenCalled();
	});

	it("once removes the handler after the first emission", () => {
		const bus = createEventBus();
		const handler = vi.fn();
		bus.once("post-updated", handler);

		const payload = {
			post: { id: "p1", title: "Hi", slug: "hi", status: "draft", blogId: "b1", authorId: "u1" },
		};

		bus.emit("post-updated", payload);
		bus.emit("post-updated", payload);

		expect(handler).toHaveBeenCalledOnce();
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	initEntryAnimations,
	resetEntryAnimationRuntimeForTests,
} from "@/lib/entry-animation-controller";
import { ENTRY_ANIMATION_PLAYED_CLASS } from "@shared/animation-utils";

describe("entry-animation-controller", () => {
	let observeMock: ReturnType<typeof vi.fn>;
	let disconnectMock: ReturnType<typeof vi.fn>;
	let intersectionCallback: IntersectionObserverCallback | null = null;

	beforeEach(() => {
		resetEntryAnimationRuntimeForTests();
		vi.useFakeTimers();
		disconnectMock = vi.fn();
		observeMock = vi.fn();

		class MockIntersectionObserver {
			constructor(cb: IntersectionObserverCallback) {
				intersectionCallback = cb;
			}
			observe = observeMock;
			unobserve = vi.fn();
			disconnect = disconnectMock;
		}

		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

		document.body.innerHTML =
			'<div class="block-test" data-np-entry="fadeIn" data-np-entry-duration="800"></div>';
		Object.defineProperty(document, "readyState", {
			configurable: true,
			value: "complete",
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("observes entry elements after page ready and plays animate.css classes in view", () => {
		initEntryAnimations();
		vi.runAllTimers();

		expect(observeMock).toHaveBeenCalled();
		const el = document.querySelector(".block-test") as HTMLElement;

		intersectionCallback?.(
			[{ isIntersecting: true, target: el } as IntersectionObserverEntry],
			{} as IntersectionObserver,
		);

		expect(el.classList.contains("animate__animated")).toBe(true);
		expect(el.classList.contains("animate__fadeIn")).toBe(true);
		expect(el.classList.contains(ENTRY_ANIMATION_PLAYED_CLASS)).toBe(true);
	});
});

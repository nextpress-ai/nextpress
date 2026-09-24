import { describe, expect, it, beforeEach } from "vitest";
import { getRecentColors, rememberRecentColor, resetRecentColors } from "./recent-color-store";

describe("recent color store", () => {
	beforeEach(() => {
		resetRecentColors();
	});

	it("puts the latest pick first and drops repeats", () => {
		rememberRecentColor({ kind: "solid", color: "#111111" });
		rememberRecentColor({ kind: "solid", color: "#222222" });
		rememberRecentColor({ kind: "solid", color: "#111111" });
		expect(getRecentColors()).toEqual([
			{ kind: "solid", color: "#111111" },
			{ kind: "solid", color: "#222222" },
		]);
	});

	it("keeps a gradient as its own pick", () => {
		const fill = {
			kind: "gradient" as const,
			shape: "linear" as const,
			angle: 90,
			stops: [
				{ color: "#ff0000", position: 0 },
				{ color: "#0000ff", position: 100 },
			],
		};
		rememberRecentColor({ kind: "gradient", fill });
		expect(getRecentColors()[0]).toEqual({ kind: "gradient", fill });
	});
});

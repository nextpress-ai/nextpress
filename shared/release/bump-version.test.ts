import { describe, it, expect } from "vitest";
import { bumpDeployVersion, bumpVersion } from "./bump-version";

describe("bumpDeployVersion", () => {
	it("increments patch below 10", () => {
		expect(bumpDeployVersion("1.0.9")).toBe("1.0.10");
		expect(bumpDeployVersion("1.1.3")).toBe("1.1.4");
	});

	it("rolls minor when patch is 10", () => {
		expect(bumpDeployVersion("1.0.10")).toBe("1.1.0");
		expect(bumpDeployVersion("1.1.10")).toBe("1.2.0");
	});
});

describe("bumpVersion", () => {
	it("supports explicit bump kinds", () => {
		expect(bumpVersion({ current: "1.0.10", kind: "minor" })).toBe("1.1.0");
		expect(bumpVersion({ current: "1.0.10", kind: "major" })).toBe("2.0.0");
		expect(bumpVersion({ current: "1.0.9", kind: "patch" })).toBe("1.0.10");
	});
});

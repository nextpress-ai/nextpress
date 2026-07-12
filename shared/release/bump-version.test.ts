import { describe, it, expect } from "vitest";
import { bumpDeployVersion, bumpVersion, revertDeployVersion, revertVersion } from "./bump-version";

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

describe("revertDeployVersion", () => {
	it("decrements patch above 0", () => {
		expect(revertDeployVersion("1.3.4")).toBe("1.3.3");
		expect(revertDeployVersion("1.0.10")).toBe("1.0.9");
	});

	it("rolls back to patch 10 when patch is 0", () => {
		expect(revertDeployVersion("1.1.0")).toBe("1.0.10");
		expect(revertDeployVersion("1.2.0")).toBe("1.1.10");
	});

	it("returns null at 1.0.0", () => {
		expect(revertDeployVersion("1.0.0")).toBeNull();
	});
});

describe("revertVersion", () => {
	it("mirrors deploy bump", () => {
		expect(revertVersion({ current: "1.3.4", kind: "deploy" })).toBe("1.3.3");
		expect(revertVersion({ current: "1.1.0", kind: "deploy" })).toBe("1.0.10");
	});

	it("supports explicit revert kinds", () => {
		expect(revertVersion({ current: "1.0.10", kind: "patch" })).toBe("1.0.9");
		expect(revertVersion({ current: "1.1.0", kind: "minor" })).toBe("1.0.0");
		expect(revertVersion({ current: "2.0.0", kind: "major" })).toBe("1.0.0");
	});
});

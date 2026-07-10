import { describe, expect, it } from "vitest";
import {
	VERSION_STALE,
	checkExpectedVersion,
	parseExpectedVersion,
	stripVersionControlFields,
} from "./content-version";

describe("content-version", () => {
	it("parseExpectedVersion accepts non-negative integers", () => {
		expect(parseExpectedVersion({ expectedVersion: 3 })).toEqual({ ok: true, expectedVersion: 3 });
		expect(parseExpectedVersion({ expectedVersion: -1 }).ok).toBe(false);
		expect(parseExpectedVersion({}).ok).toBe(false);
	});

	it("checkExpectedVersion matches remote === expected", () => {
		expect(checkExpectedVersion({ remoteVersion: 2, expectedVersion: 2 }).ok).toBe(true);
		expect(checkExpectedVersion({ remoteVersion: 3, expectedVersion: 2 }).ok).toBe(false);
	});

	it("stripVersionControlFields removes concurrency keys", () => {
		const stripped = stripVersionControlFields({
			title: "Hi",
			expectedVersion: 1,
			version: 99,
		});
		expect(stripped).toEqual({ title: "Hi" });
	});

	it("exports VERSION_STALE code", () => {
		expect(VERSION_STALE).toBe("VERSION_STALE");
	});
});

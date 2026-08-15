import { describe, expect, it } from "vitest";
import { mergeAuthorDisplay } from "@shared/author-display";

describe("mergeAuthorDisplay", () => {
	it("uses the live profile when no custom fields are set", () => {
		const merged = mergeAuthorDisplay({
			override: null,
			live: { name: "Hussein", avatar: "/me.png", bio: "Writes things." },
			postAuthor: { name: "Post Author", bio: "Fallback" },
		});

		expect(merged).toEqual({ name: "Hussein", avatar: "/me.png", bio: "Writes things." });
	});

	it("lets custom fields replace matching profile details", () => {
		const merged = mergeAuthorDisplay({
			override: { name: "Staff Writer", avatar: "", bio: "" },
			live: { name: "Hussein", avatar: "/me.png", bio: "Writes things." },
			postAuthor: null,
		});

		expect(merged).toEqual({
			name: "Staff Writer",
			avatar: "/me.png",
			bio: "Writes things.",
		});
	});

	it("falls back to the post author when no profile is available", () => {
		const merged = mergeAuthorDisplay({
			override: null,
			live: null,
			postAuthor: { name: "Post Author", bio: "Fallback" },
		});

		expect(merged).toEqual({ name: "Post Author", bio: "Fallback" });
	});

	it("returns an empty object when no author source exists", () => {
		const merged = mergeAuthorDisplay({
			override: null,
			live: null,
			postAuthor: null,
		});

		expect(merged).toEqual({});
	});

	it("ignores whitespace-only custom values", () => {
		const merged = mergeAuthorDisplay({
			override: { name: "   ", avatar: "", bio: "" },
			live: { name: "Hussein", bio: "Writes things." },
			postAuthor: null,
		});

		expect(merged).toEqual({ name: "Hussein", bio: "Writes things." });
	});
});
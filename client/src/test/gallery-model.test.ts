import { describe, it, expect } from "vitest";
import { readGalleryData, DEFAULT_DATA, resolveGalleryColumns } from "@shared/gallery-model";

describe("readGalleryData", () => {
	it("reads images from unwrapped accessor content", () => {
		const data = readGalleryData({
			images: [{ id: "1", url: "/a.jpg", alt: "A" }],
			columns: 2,
		});

		expect(data.images).toHaveLength(1);
		expect(data.images?.[0]?.url).toBe("/a.jpg");
		expect(data.columns).toBe(2);
	});

	it("reads images from structured persisted content", () => {
		const data = readGalleryData({
			kind: "structured",
			data: {
				images: [
					{ id: "1", url: "/a.jpg", alt: "A" },
					{ id: "2", url: "/b.jpg", alt: "B" },
				],
			},
		});

		expect(data.images).toHaveLength(2);
	});

	it("falls back to defaults for missing content", () => {
		expect(readGalleryData(undefined)).toEqual(DEFAULT_DATA);
	});
});

describe("resolveGalleryColumns", () => {
	it("reduces columns when fewer images remain", () => {
		expect(resolveGalleryColumns({ imageCount: 2, columns: 3 })).toBe(2);
		expect(resolveGalleryColumns({ imageCount: 1, columns: 4 })).toBe(1);
	});

	it("keeps columns when image count is still sufficient", () => {
		expect(resolveGalleryColumns({ imageCount: 5, columns: 3 })).toBe(3);
		expect(resolveGalleryColumns({ imageCount: 3, columns: 2 })).toBe(2);
	});

	it("does not raise columns when images are added", () => {
		expect(resolveGalleryColumns({ imageCount: 4, columns: 2 })).toBe(2);
	});
});

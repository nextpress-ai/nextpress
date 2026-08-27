/**
 * Transfer engine tests — round trip, overwrite/skip modes, FK ordering,
 * site scoping, entity selection, per-row error continuation and manifest
 * validation. All data is created by the fixtures; nothing depends on a
 * persistent database.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createTransferExporter } from "./export-data.js";
import { createTransferImporter } from "./import-data.js";
import { detectFormat, validateExportFile } from "./manifest.js";
import { buildTestModels, byId, IDS, seedFixture, wipeAll } from "./test-fixtures.js";
import type { ExportFile } from "./types.js";

const models = buildTestModels();
const exporter = createTransferExporter({ models, appVersion: "1.0.0-test", log: () => {} });
const importer = createTransferImporter({ models, log: () => {} });

/** Simulate the real JSON-on-the-wire round trip (dates become ISO strings). */
function roundTrip(file: ExportFile): ExportFile {
	return validateExportFile(JSON.parse(JSON.stringify(file)));
}

beforeEach(async () => {
	await wipeAll();
	await seedFixture(models);
});

describe("transfer round trip", () => {
	it("seed → export all → wipe → import → rows equal the originals", async () => {
		const originalUsers = await models.users.findMany({ limit: 1000 });
		const originalSites = await models.sites.findMany({ limit: 1000 });
		const originalRoles = await models.roles.findMany({ limit: 1000 });
		const originalUserRoles = await models.userRoles.findMany({ limit: 1000 });
		const originalTemplates = await models.templates.findMany({ limit: 1000 });
		const originalPages = await models.pages.findMany({ limit: 1000 });
		const originalBlogs = await models.blogs.findMany({ limit: 1000 });
		const originalPosts = await models.posts.findMany({ limit: 1000 });
		const originalComments = await models.comments.findMany({ limit: 1000 });
		const originalMedia = await models.media.findMany({ limit: 1000 });
		const originalOptions = await models.options.findMany({ limit: 1000 });

		const exportFile = roundTrip(await exporter.exportData({}));
		expect(exportFile.manifest.format).toBe("nextpress-export");
		expect(exportFile.manifest.siteScope).toBe("all");
		expect(exportFile.manifest.entityCounts).toEqual({
			users: 2,
			sites: 2,
			pages: 3,
			blogs: 2,
			posts: 2,
			comments: 3,
			media: 2,
			templates: 1,
			options: 2,
		});

		await wipeAll();
		const summary = await importer.importData({ exportFile, mode: "overwrite" });

		for (const entry of Object.values(summary)) {
			expect(entry.errors).toEqual([]);
		}
		expect(summary.users?.created).toBe(2);
		// The sites entity aggregates sites + roles + userRoles (2 + 1 + 1).
		expect(summary.sites?.created).toBe(4);
		expect(summary.pages?.created).toBe(3);

		expect((await models.users.findMany({ limit: 1000 })).sort(byId)).toEqual(originalUsers.sort(byId));
		expect((await models.sites.findMany({ limit: 1000 })).sort(byId)).toEqual(originalSites.sort(byId));
		expect((await models.roles.findMany({ limit: 1000 })).sort(byId)).toEqual(originalRoles.sort(byId));
		expect((await models.userRoles.findMany({ limit: 1000 })).sort(byId)).toEqual(
			originalUserRoles.sort(byId),
		);
		expect((await models.templates.findMany({ limit: 1000 })).sort(byId)).toEqual(
			originalTemplates.sort(byId),
		);
		expect((await models.pages.findMany({ limit: 1000 })).sort(byId)).toEqual(originalPages.sort(byId));
		expect((await models.blogs.findMany({ limit: 1000 })).sort(byId)).toEqual(originalBlogs.sort(byId));
		expect((await models.posts.findMany({ limit: 1000 })).sort(byId)).toEqual(originalPosts.sort(byId));
		expect((await models.comments.findMany({ limit: 1000 })).sort(byId)).toEqual(
			originalComments.sort(byId),
		);
		expect((await models.media.findMany({ limit: 1000 })).sort(byId)).toEqual(originalMedia.sort(byId));
		expect((await models.options.findMany({ limit: 1000 })).sort(byId)).toEqual(
			originalOptions.sort(byId),
		);
	});
});

describe("import modes", () => {
	it("overwrite updates changed rows; skip leaves them alone", async () => {
		const exportFile = roundTrip(await exporter.exportData({}));

		await models.pages.update(IDS.pageA1, { title: "Changed Title" });
		await importer.importData({ exportFile, mode: "overwrite" });
		expect((await models.pages.findById(IDS.pageA1))?.title).toBe("Home");

		await models.pages.update(IDS.pageA1, { title: "Changed Again" });
		const summary = await importer.importData({ exportFile, mode: "skip" });
		expect((await models.pages.findById(IDS.pageA1))?.title).toBe("Changed Again");
		expect(summary.pages?.skipped).toBe(3);
		expect(summary.pages?.updated).toBe(0);
	});
});

describe("FK ordering", () => {
	it("imports page parent-child chains and comment threads without FK errors", async () => {
		const exportFile = roundTrip(await exporter.exportData({}));
		await wipeAll();
		const summary = await importer.importData({ exportFile, mode: "overwrite" });

		expect(summary.pages?.errors).toEqual([]);
		expect(summary.comments?.errors).toEqual([]);
		expect((await models.pages.findById(IDS.pageA2))?.parentId).toBe(IDS.pageA1);
		expect((await models.comments.findById(IDS.commentA2))?.parentId).toBe(IDS.commentA1);
	});

	it("treats a page whose parent is outside the exported set as a leaf", async () => {
		const pageA2 = await models.pages.findById(IDS.pageA2);
		expect(pageA2).toBeDefined();
		const exportFile = roundTrip(
			await exporter.exportData({
				entities: ["pages"],
			}),
		);
		// Point pageA2 at a parent that is not in the exported set.
		const danglingParent = "00000000-0000-4000-8000-000000000000";
		exportFile.data.pages = exportFile.data.pages?.map((page) =>
			page.id === IDS.pageA2 ? { ...page, parentId: danglingParent } : page,
		);

		const summary = await importer.importData({ exportFile, mode: "overwrite" });
		expect(summary.pages?.errors).toEqual([]);
		expect((await models.pages.findById(IDS.pageA2))?.parentId).toBe(danglingParent);
	});
});

describe("site scoping", () => {
	it("scoped export contains only site A data plus referenced users and templates", async () => {
		const exportFile = await exporter.exportData({ siteSlug: "Site A" });

		expect(exportFile.manifest.siteScope).toEqual({ id: IDS.siteA, slug: "Site A" });
		expect(exportFile.data.sites?.sites.map((site) => site.id)).toEqual([IDS.siteA]);
		expect(exportFile.data.sites?.roles.map((role) => role.id)).toEqual([IDS.roleA]);
		expect(exportFile.data.sites?.userRoles.map((userRole) => userRole.id)).toEqual([IDS.userRoleA]);
		expect(exportFile.data.pages?.map((page) => page.id).sort()).toEqual([IDS.pageA1, IDS.pageA2].sort());
		expect(exportFile.data.blogs?.map((blog) => blog.id)).toEqual([IDS.blogA]);
		expect(exportFile.data.posts?.map((post) => post.id)).toEqual([IDS.postA1]);
		expect(exportFile.data.comments?.map((comment) => comment.id).sort()).toEqual(
			[IDS.commentA1, IDS.commentA2].sort(),
		);
		expect(exportFile.data.media?.map((mediaRow) => mediaRow.id)).toEqual([IDS.mediaA1]);
		expect(exportFile.data.options?.map((option) => option.id)).toEqual([IDS.optionA1]);
		expect(exportFile.data.users?.map((user) => user.id)).toEqual([IDS.userA]);
		expect(exportFile.data.templates?.map((template) => template.id)).toEqual([IDS.templateA]);
	});

	it("resolves a site by hostname too", async () => {
		const exportFile = await exporter.exportData({ siteSlug: "site-a.example.com" });
		expect(exportFile.manifest.siteScope).toEqual({ id: IDS.siteA, slug: "Site A" });
	});

	it("throws a humanized error for an unknown site", async () => {
		await expect(exporter.exportData({ siteSlug: "nope" })).rejects.toThrow(
			/No site matches "nope"/,
		);
	});
});

describe("entity selection", () => {
	it("exports and imports only the selected keys", async () => {
		const exportFile = await exporter.exportData({ entities: ["users"] });
		expect(Object.keys(exportFile.data)).toEqual(["users"]);
		expect(Object.keys(exportFile.manifest.entityCounts)).toEqual(["users"]);

		await wipeAll();
		const summary = await importer.importData({ exportFile, mode: "overwrite" });
		expect(Object.keys(summary)).toEqual(["users"]);
		expect(summary.users?.created).toBe(2);
		expect(summary.users?.errors).toEqual([]);

		expect((await models.users.findMany({ limit: 1000 })).length).toBe(2);
		expect((await models.sites.findMany({ limit: 1000 })).length).toBe(0);
		expect((await models.pages.findMany({ limit: 1000 })).length).toBe(0);
	});
});

describe("per-row error handling", () => {
	it("a bad row never aborts the import — errors are recorded and the rest continues", async () => {
		const exportFile = roundTrip(await exporter.exportData({}));
		// Break one post: point it at a blog that does not exist.
		const postA1 = exportFile.data.posts?.find((post) => post.id === IDS.postA1);
		if (!postA1) throw new Error("fixture post missing");
		const brokenPost = { ...postA1, blogId: "00000000-0000-4000-8000-000000000000" };
		exportFile.data.posts = exportFile.data.posts?.map((post) =>
			post.id === IDS.postA1 ? brokenPost : post,
		);

		await wipeAll();
		const summary = await importer.importData({ exportFile, mode: "overwrite" });

		expect(summary.users?.created).toBe(2);
		expect(summary.posts?.created).toBe(1); // postB1 imported fine
		expect(summary.posts?.errors.length).toBe(1);
		expect(summary.posts?.errors[0]).toMatch(/Could not import post/);
		expect((await models.posts.findById(IDS.postB1))?.title).toBe("Post B1");
		expect(await models.posts.findById(IDS.postA1)).toBeUndefined();
	});
});

describe("manifest validation", () => {
	it("rejects invalid manifests with humanized errors and leaves the DB untouched", async () => {
		const before = await models.users.findMany({ limit: 1000 });

		expect(() => validateExportFile({ manifest: { format: "other" }, data: {} })).toThrow(
			/not a NextPress export/,
		);
		expect(() =>
			validateExportFile({ manifest: { format: "nextpress-export", formatVersion: 99 }, data: {} }),
		).toThrow(/newer version/);
		expect(() =>
			validateExportFile({
				manifest: { format: "nextpress-export", formatVersion: 1 },
				data: { bogus: [] },
			}),
		).toThrow(/unknown data section/);
		expect(() => validateExportFile(null)).toThrow(/not a NextPress export/);

		expect(detectFormat(Buffer.from([0x1f, 0x8b, 0x08, 0x00]))).toBe("targz");
		expect(detectFormat(Buffer.from("{}"))).toBe("json");

		const badFile = {
			manifest: { format: "nextpress-export", formatVersion: 99 },
			data: {},
		} as unknown as ExportFile;
		await expect(importer.importData({ exportFile: badFile, mode: "overwrite" })).rejects.toThrow(
			/newer version/,
		);

		const after = await models.users.findMany({ limit: 1000 });
		expect(after.length).toBe(before.length);
	});
});
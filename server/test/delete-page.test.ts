import { describe, it, expect, beforeEach, vi } from "vitest";
import { testDb } from "./setup";
import { createModel } from "@shared/create-models";
import { createOptionModel } from "../storage";
import { blogs, options, pages, posts, sites, users } from "@shared/schema";
import { deletePageWithDependencies, PageDeleteError } from "../lib/delete-page";

const testIds = {
	user: "660e8400-e29b-41d4-a716-446655440001",
	site: "660e8400-e29b-41d4-a716-446655440002",
	blog: "660e8400-e29b-41d4-a716-446655440003",
	page: "660e8400-e29b-41d4-a716-446655440004",
};

const pageRecord = {
	id: testIds.page,
	slug: "blog-news",
	siteId: testIds.site,
};

describe("deletePageWithDependencies", () => {
	const pageModel = createModel(pages, testDb);
	const blogModel = createModel(blogs, testDb);
	const postModel = createModel(posts, testDb);
	const optionModel = createOptionModel(testDb);
	const hooks = { doAction: vi.fn() };
	const models = {
		pages: pageModel,
		blogs: blogModel,
		posts: postModel,
		options: optionModel,
	};

	beforeEach(async () => {
		hooks.doAction.mockClear();
		await testDb.delete(posts);
		await testDb.delete(options);
		await testDb.delete(blogs);
		await testDb.delete(pages);
		await testDb.delete(sites);
		await testDb.delete(users);

		await testDb.insert(users).values({
			id: testIds.user,
			username: "editor",
			email: "editor@example.com",
			password: "hash",
			status: "active",
		});
		await testDb.insert(sites).values({
			id: testIds.site,
			name: "Test Site",
			ownerId: testIds.user,
		});
	});

	it("deletes a blog index page and its linked blog when the blog has no posts", async () => {
		await testDb.insert(pages).values({
			id: testIds.page,
			title: "News Blog",
			slug: pageRecord.slug,
			authorId: testIds.user,
			siteId: testIds.site,
			other: { isBlogPage: true, blogId: testIds.blog },
		});
		await testDb.insert(blogs).values({
			id: testIds.blog,
			name: "News",
			slug: "news",
			authorId: testIds.user,
			siteId: testIds.site,
			pageId: testIds.page,
		});

		await deletePageWithDependencies({ models, hooks }, pageRecord);

		const page = await pageModel.findById(testIds.page);
		const blog = await blogModel.findById(testIds.blog);
		expect(page).toBeUndefined();
		expect(blog).toBeUndefined();
		expect(hooks.doAction).toHaveBeenCalledWith("delete_blog", testIds.blog);
	});

	it("blocks deletion when the linked blog still has posts", async () => {
		await testDb.insert(pages).values({
			id: testIds.page,
			title: "News Blog",
			slug: pageRecord.slug,
			authorId: testIds.user,
			siteId: testIds.site,
		});
		await testDb.insert(blogs).values({
			id: testIds.blog,
			name: "News",
			slug: "news",
			authorId: testIds.user,
			siteId: testIds.site,
			pageId: testIds.page,
		});

		const postsWithCount = {
			...postModel,
			count: vi.fn().mockResolvedValue(2),
		};

		await expect(
			deletePageWithDependencies(
				{ models: { ...models, posts: postsWithCount }, hooks },
				pageRecord,
			),
		).rejects.toBeInstanceOf(PageDeleteError);

		expect(await pageModel.findById(testIds.page)).toBeDefined();
		expect(await blogModel.findById(testIds.blog)).toBeDefined();
	});

	it("blocks deletion when the page is the site homepage", async () => {
		await testDb.insert(pages).values({
			id: testIds.page,
			title: "Home",
			slug: "home",
			authorId: testIds.user,
			siteId: testIds.site,
		});
		await optionModel.setOption({
			name: "homepage_page_slug",
			value: "home",
			siteId: testIds.site,
		});

		await expect(
			deletePageWithDependencies(
				{ models, hooks },
				{ id: testIds.page, slug: "home", siteId: testIds.site },
			),
		).rejects.toBeInstanceOf(PageDeleteError);

		expect(await pageModel.findById(testIds.page)).toBeDefined();
	});
});

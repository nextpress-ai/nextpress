/**
 * Self-contained fixtures for the transfer engine tests.
 *
 * Every test file that imports this gets its own in-memory PGlite (vitest
 * isolates modules per file), so tests never touch the dev database. All
 * values a test asserts on are created here — nothing depends on persistent
 * DB state.
 */
import { createModel } from "@shared/create-models";
import {
	blogs,
	comments,
	media,
	options,
	pages,
	posts,
	roles,
	sites,
	templates,
	userRoles,
	users,
} from "@shared/schema";
import { testDb } from "../test/setup.js";
import type { TransferModels } from "./types.js";

/** Deterministic UUIDs so tests can reference rows by id. */
export const IDS = {
	userA: "11111111-1111-4111-8111-111111111111",
	userB: "22222222-2222-4222-8222-222222222222",
	siteA: "33333333-3333-4333-8333-333333333333",
	siteB: "44444444-4444-4444-8444-444444444444",
	roleA: "55555555-5555-4555-8555-555555555555",
	userRoleA: "66666666-6666-4666-8666-666666666666",
	templateA: "77777777-7777-4777-8777-777777777777",
	pageA1: "88888888-8888-4888-8888-888888888888",
	pageA2: "99999999-9999-4999-8999-999999999999",
	pageB1: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	blogA: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	blogB: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	postA1: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
	postB1: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
	commentA1: "ffffffff-ffff-4fff-8fff-ffffffffffff",
	commentA2: "12121212-1212-4121-8121-121212121212",
	commentB1: "13131313-1313-4131-8131-131313131313",
	mediaA1: "14141414-1414-4141-8141-141414141414",
	mediaB1: "15151515-1515-4151-8151-151515151515",
	optionA1: "16161616-1616-4161-8161-161616161616",
	optionB1: "17171717-1717-4171-8171-171717171717",
} as const;

const T0 = new Date("2026-01-01T00:00:00.000Z");

/** Build engine-ready models on the in-memory test database. */
export function buildTestModels(): TransferModels {
	return {
		users: createModel(users, testDb),
		sites: createModel(sites, testDb),
		roles: createModel(roles, testDb),
		userRoles: createModel(userRoles, testDb),
		pages: createModel(pages, testDb),
		blogs: createModel(blogs, testDb),
		posts: createModel(posts, testDb),
		comments: createModel(comments, testDb),
		media: createModel(media, testDb),
		templates: createModel(templates, testDb),
		options: createModel(options, testDb),
	};
}

/** Seed two sites with full content. FK-safe order: users → sites → roles → userRoles → templates → pages → blogs → posts → comments → media → options. */
export async function seedFixture(models: TransferModels): Promise<void> {
	await models.users.create({
		id: IDS.userA,
		username: "alice",
		email: "alice@example.com",
		emailVerified: true,
		firstName: "Alice",
		password: "hash-a",
		status: "active",
		createdAt: T0,
		updatedAt: T0,
		other: {},
	});
	await models.users.create({
		id: IDS.userB,
		username: "bob",
		email: "bob@example.com",
		emailVerified: true,
		firstName: "Bob",
		password: "hash-b",
		status: "active",
		createdAt: T0,
		updatedAt: T0,
		other: {},
	});

	await models.sites.create({
		id: IDS.siteA,
		name: "Site A",
		siteUrl: "https://site-a.example.com",
		ownerId: IDS.userA,
		isDefault: true,
		settings: {},
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.sites.create({
		id: IDS.siteB,
		name: "Site B",
		siteUrl: "https://site-b.example.com",
		ownerId: IDS.userB,
		isDefault: false,
		settings: {},
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});

	await models.roles.create({
		id: IDS.roleA,
		name: "admin",
		description: "Site A admin",
		siteId: IDS.siteA,
		capabilities: [],
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.userRoles.create({
		id: IDS.userRoleA,
		userId: IDS.userA,
		roleId: IDS.roleA,
		siteId: IDS.siteA,
		createdAt: T0,
		updatedAt: T0,
	});

	await models.templates.create({
		id: IDS.templateA,
		name: "Main Template",
		type: "page",
		description: "Default page template",
		authorId: IDS.userA,
		blocks: [],
		settings: {},
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});

	await models.pages.create({
		id: IDS.pageA1,
		title: "Home",
		slug: "home",
		siteId: IDS.siteA,
		status: "publish",
		authorId: IDS.userA,
		templateId: IDS.templateA,
		parentId: null,
		menuOrder: 0,
		blocks: [],
		version: 1,
		history: [],
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.pages.create({
		id: IDS.pageA2,
		title: "About",
		slug: "about",
		siteId: IDS.siteA,
		status: "publish",
		authorId: IDS.userA,
		parentId: IDS.pageA1,
		menuOrder: 1,
		blocks: [],
		version: 1,
		history: [],
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.pages.create({
		id: IDS.pageB1,
		title: "Home B",
		slug: "home",
		siteId: IDS.siteB,
		status: "publish",
		authorId: IDS.userB,
		parentId: null,
		menuOrder: 0,
		blocks: [],
		version: 1,
		history: [],
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});

	await models.blogs.create({
		id: IDS.blogA,
		name: "Blog A",
		slug: "blog-a",
		siteId: IDS.siteA,
		authorId: IDS.userA,
		settings: {},
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.blogs.create({
		id: IDS.blogB,
		name: "Blog B",
		slug: "blog-b",
		siteId: IDS.siteB,
		authorId: IDS.userB,
		settings: {},
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});

	await models.posts.create({
		id: IDS.postA1,
		title: "Post A1",
		slug: "post-a1",
		status: "publish",
		authorId: IDS.userA,
		blogId: IDS.blogA,
		parentId: null,
		blocks: [],
		version: 1,
		settings: {},
		other: { categories: [], tags: [] },
		createdAt: T0,
		updatedAt: T0,
	});
	await models.posts.create({
		id: IDS.postB1,
		title: "Post B1",
		slug: "post-b1",
		status: "publish",
		authorId: IDS.userB,
		blogId: IDS.blogB,
		parentId: null,
		blocks: [],
		version: 1,
		settings: {},
		other: { categories: [], tags: [] },
		createdAt: T0,
		updatedAt: T0,
	});

	await models.comments.create({
		id: IDS.commentA1,
		postId: IDS.postA1,
		authorId: IDS.userA,
		authorName: "Alice",
		content: "First!",
		status: "approved",
		parentId: null,
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.comments.create({
		id: IDS.commentA2,
		postId: IDS.postA1,
		authorId: IDS.userA,
		authorName: "Alice",
		content: "Reply to first",
		status: "approved",
		parentId: IDS.commentA1,
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.comments.create({
		id: IDS.commentB1,
		postId: IDS.postB1,
		authorId: IDS.userB,
		authorName: "Bob",
		content: "B comment",
		status: "approved",
		parentId: null,
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});

	await models.media.create({
		id: IDS.mediaA1,
		filename: "fixture-image.png",
		originalName: "fixture-image.png",
		mimeType: "image/png",
		size: 123,
		url: "/uploads/fixture-image.png",
		siteId: IDS.siteA,
		authorId: IDS.userA,
		alt: "Fixture",
		createdAt: T0,
		updatedAt: T0,
	});
	await models.media.create({
		id: IDS.mediaB1,
		filename: "b-file.png",
		originalName: "b-file.png",
		mimeType: "image/png",
		size: 456,
		url: "/uploads/b-file.png",
		siteId: IDS.siteB,
		authorId: IDS.userB,
		alt: "B file",
		createdAt: T0,
		updatedAt: T0,
	});

	await models.options.create({
		id: IDS.optionA1,
		siteId: IDS.siteA,
		name: "homepage_page_slug",
		value: "home",
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
	await models.options.create({
		id: IDS.optionB1,
		siteId: IDS.siteB,
		name: "homepage_page_slug",
		value: "home",
		other: {},
		createdAt: T0,
		updatedAt: T0,
	});
}

/** Delete every row, children before parents so FK constraints never bite. */
export async function wipeAll(): Promise<void> {
	await testDb.delete(comments);
	await testDb.delete(posts);
	await testDb.delete(blogs);
	await testDb.delete(pages);
	await testDb.delete(templates);
	await testDb.delete(media);
	await testDb.delete(options);
	await testDb.delete(userRoles);
	await testDb.delete(roles);
	await testDb.delete(sites);
	await testDb.delete(users);
}

/** Sort rows by id for stable deep comparisons. */
export function byId<T extends { id: string }>(a: T, b: T): number {
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
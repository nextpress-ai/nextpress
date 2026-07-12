import type { Deps } from "../routes/shared/deps";

export class PageDeleteError extends Error {
	statusCode: number;

	constructor(message: string, statusCode = 409) {
		super(message);
		this.name = "PageDeleteError";
		this.statusCode = statusCode;
	}
}

type PageForDelete = {
	id: string;
	slug: string | null;
	siteId: string;
};

type DeletePageDeps = {
	models: Deps["models"];
	hooks: Deps["hooks"];
};

/**
 * Deletes a page and any blog index that points at it.
 * Blocks removal when the page is the site homepage or its blog still has posts.
 */
export async function deletePageWithDependencies(
	deps: DeletePageDeps,
	page: PageForDelete,
): Promise<void> {
	const { models, hooks } = deps;
	const pageId = page.id;

	if (page.slug) {
		const homepageOption = await models.options.getOption(
			"homepage_page_slug",
			String(page.siteId),
		);
		if (homepageOption?.value === page.slug) {
			throw new PageDeleteError(
				"This page is set as your site homepage. Choose a different homepage before deleting it.",
			);
		}
	}

	const linkedBlogs = await models.blogs.findManyWhere([{ where: "pageId", equals: pageId }]);

	for (const blog of linkedBlogs) {
		const postCount = await models.posts.count({
			where: [{ where: "blogId", equals: blog.id }],
		});

		if (postCount > 0) {
			const label = typeof blog.name === "string" && blog.name.trim() ? blog.name : "this blog";
			throw new PageDeleteError(
				`This page is used by the "${label}" blog. Delete or move its posts before deleting this page.`,
			);
		}

		await models.blogs.delete(blog.id);
		hooks.doAction("delete_blog", blog.id);
	}

	await models.pages.delete(pageId);
	hooks.doAction("delete_post", pageId);
}

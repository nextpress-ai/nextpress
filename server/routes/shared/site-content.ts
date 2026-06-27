import type { Deps } from "./deps";

/** Post IDs belonging to a site (via blogs) — used to scope comments. */
export const getSitePostIds = async (params: {
	models: Deps["models"];
	siteId: string;
}): Promise<string[]> => {
	const blogIds = await getSiteBlogIds(params);
	if (blogIds.length === 0) return [];

	const posts = await params.models.posts.findManyWhere([{ where: "blogId", in: blogIds }]);
	return posts.map((post) => post.id);
};

/** Blog IDs belonging to a site — used to scope posts/comments. */
export const getSiteBlogIds = async (params: {
	models: Deps["models"];
	siteId: string;
}): Promise<string[]> => {
	const blogs = await params.models.blogs.findManyWhere([
		{ where: "siteId", equals: params.siteId },
	]);
	return blogs.map((blog) => blog.id);
};

/** Returns true when every blogId belongs to the given site. */
export const blogsBelongToSite = async (params: {
	models: Deps["models"];
	siteId: string;
	blogIds: string[];
}): Promise<boolean> => {
	if (params.blogIds.length === 0) return true;
	const blogs = await params.models.blogs.findManyWhere([
		{ where: "siteId", equals: params.siteId },
	]);
	const allowed = new Set(blogs.map((blog) => blog.id));
	return params.blogIds.every((id) => allowed.has(id));
};

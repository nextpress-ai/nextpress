export type AdjacentPostRow = {
	id: string;
	title: string;
	slug: string;
	featuredImage?: string | null;
	status?: string | null;
	blogId?: string | null;
	createdAt?: string | Date | null;
};

type AdjacentPost = {
	id: string;
	title: string;
	slug: string;
	featuredImage?: string | null;
};

/**
 * Previous/next published siblings in the same blog (createdAt order).
 * Shared by the JSON adjacent API and SSR HTML so the two cannot drift.
 */
export async function loadAdjacentPosts({
	findSiblings,
	post,
}: {
	findSiblings: (blogId: string) => Promise<AdjacentPostRow[]>;
	post: AdjacentPostRow;
}): Promise<{ prev: AdjacentPost | null; next: AdjacentPost | null }> {
	if (!post.blogId) {
		return { prev: null, next: null };
	}

	const siblings = (await findSiblings(post.blogId)).filter(
		(item) => item.status === "publish" || item.id === post.id,
	);
	const index = siblings.findIndex((item) => item.id === post.id);
	const toAdjacent = (item: AdjacentPostRow | undefined): AdjacentPost | null =>
		item
			? {
					id: item.id,
					title: item.title,
					slug: item.slug,
					featuredImage: item.featuredImage,
				}
			: null;

	return {
		prev: index > 0 ? toAdjacent(siblings[index - 1]) : null,
		next:
			index >= 0 && index < siblings.length - 1
				? toAdjacent(siblings[index + 1])
				: null,
	};
}

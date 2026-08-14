import { authorDisplayFromUser, type AuthorDisplay } from "@shared/author-display";

type ModelsWithUsers = {
	users: { findById: (id: string) => Promise<unknown> };
};

/**
 * Attach a public author card to a post payload for preview and published views.
 */
export async function attachPostAuthor<T extends { authorId?: string | null }>({
	models,
	post,
}: {
	models: ModelsWithUsers;
	post: T;
}): Promise<T & { author: AuthorDisplay | null }> {
	if (!post.authorId) {
		return { ...post, author: null };
	}
	const user = await models.users.findById(post.authorId);
	return { ...post, author: authorDisplayFromUser(user) };
}

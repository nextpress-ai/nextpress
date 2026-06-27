import { db } from "./db";
import { createModel, type DatabaseInstance } from "@shared/create-models";
import { normalizeSiteHostname } from "./utils/validate-domain";
import {
	sites,
	roles,
	userRoles,
	users,
	pages,
	templates,
	themes,
	plugins,
	options,
	blogs,
	posts,
	comments,
	media,
	sessions,
} from "@shared/schema";

// Specialized model factories for complex operations
export function createUserModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(users, dbInstance);

	return {
		...baseModel,

		/**
		 * Find a user by their username
		 * @param username - The username to search for
		 * @returns The user or undefined if not found
		 * @example
		 * const user = await userModel.findByUsername('kizz');
		 */
		async findByUsername(username: string) {
			return baseModel.findFirst([{ where: "username", equals: username }]);
		},

		/**
		 * Find a user by their email address
		 * @param email - The email address to search for
		 * @returns The user or undefined if not found
		 * @example
		 * const user = await userModel.findByEmail('user@example.com');
		 */
		async findByEmail(email: string) {
			return baseModel.findFirst([{ where: "email", equals: email }]);
		},

		/**
		 * Find users by their status
		 * @param status - The status to filter by (active, inactive, pending)
		 * @returns Array of users with the specified status
		 * @example
		 * const activeUsers = await userModel.findByStatus('active');
		 */
		async findByStatus(status: string) {
			return baseModel.findManyWhere([{ where: "status", equals: status }]);
		},
	};
}

export function createPostModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(posts, dbInstance);

	return {
		...baseModel,

		/**
		 * Find a post by its slug
		 * @param slug - The slug to search for
		 * @returns The post or undefined if not found
		 * @example
		 * const post = await postModel.findBySlug('my-awesome-post');
		 */
		async findBySlug(slug: string) {
			return baseModel.findFirst([{ where: "slug", equals: slug }]);
		},

		/**
		 * Find posts by their status
		 * @param status - The status to filter by (published, draft, etc.)
		 * @returns Array of posts with the specified status
		 * @example
		 * const publishedPosts = await postModel.findByStatus('published');
		 */
		async findByStatus(status: string) {
			return baseModel.findManyWhere([{ where: "status", equals: status }]);
		},

		/**
		 * Find posts by their author
		 * @param authorId - The UUID of the author
		 * @returns Array of posts by the specified author
		 * @example
		 * const userPosts = await postModel.findByAuthor('author-uuid');
		 */
		async findByAuthor(authorId: string) {
			return baseModel.findManyWhere([{ where: "authorId", equals: authorId }]);
		},

		/**
		 * Find posts by their blog
		 * @param blogId - The UUID of the blog
		 * @returns Array of posts in the specified blog
		 * @example
		 * const blogPosts = await postModel.findByBlog('blog-uuid');
		 */
		async findByBlog(blogId: string) {
			return baseModel.findManyWhere([{ where: "blogId", equals: blogId }]);
		},

		/**
		 * Publish a post by setting its status to 'publish' and setting publishedAt
		 * @param id - The UUID of the post to publish
		 * @returns The updated post
		 * @example
		 * const publishedPost = await postModel.publish('post-uuid');
		 */
		async publish(id: string) {
			return baseModel.update(id, {
				status: "publish",
				publishedAt: new Date(),
			});
		},
	};
}

export function createCommentModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(comments, dbInstance);

	return {
		...baseModel,

		/**
		 * Find comments by their post
		 * @param postId - The UUID of the post
		 * @returns Array of comments for the specified post
		 * @example
		 * const postComments = await commentModel.findByPost('post-uuid');
		 */
		async findByPost(postId: string) {
			return baseModel.findManyWhere([{ where: "postId", equals: postId }]);
		},

		/**
		 * Find comments by their status
		 * @param status - The status to filter by (approved, pending, spam, trash)
		 * @returns Array of comments with the specified status
		 * @example
		 * const approvedComments = await commentModel.findByStatus('approved');
		 */
		async findByStatus(status: string) {
			return baseModel.findManyWhere([{ where: "status", equals: status }]);
		},

		/**
		 * Approve a comment by setting its status to 'approved'
		 * @param id - The UUID of the comment to approve
		 * @returns The updated comment
		 * @example
		 * const approvedComment = await commentModel.approve('comment-uuid');
		 */
		async approve(id: string) {
			return baseModel.update(id, { status: "approved" });
		},

		/**
		 * Mark a comment as spam by setting its status to 'spam'
		 * @param id - The UUID of the comment to mark as spam
		 * @returns The updated comment
		 * @example
		 * const spamComment = await commentModel.spam('comment-uuid');
		 */
		async spam(id: string) {
			return baseModel.update(id, { status: "spam" });
		},
	};
}

export function createPageModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(pages, dbInstance);

	return {
		...baseModel,

		/**
		 * Find a page by its slug
		 * @param slug - The slug to search for
		 * @returns The page or undefined if not found
		 * @example
		 * const page = await pageModel.findBySlug('about-us');
		 */
		async findBySlug(slug: string) {
			return baseModel.findFirst([{ where: "slug", equals: slug }]);
		},

		/**
		 * Find a page by site ID and slug (for site-scoped routing)
		 * @param siteId - The site UUID
		 * @param slug - The page slug
		 * @returns The page or undefined if not found
		 * @example
		 * const page = await pageModel.findBySiteAndSlug(siteId, 'about-us');
		 */
		async findBySiteAndSlug(siteId: string, slug: string) {
			return baseModel.findFirst([
				{ where: "siteId", equals: siteId },
				{ where: "slug", equals: slug }
			]);
		},

		/**
		 * Find pages by their status
		 * @param status - The status to filter by (publish, draft, private, trash)
		 * @returns Array of pages with the specified status
		 * @example
		 * const publishedPages = await pageModel.findByStatus('publish');
		 */
		async findByStatus(status: string) {
			return baseModel.findManyWhere([{ where: "status", equals: status }]);
		},

		/**
		 * Find pages by their author
		 * @param authorId - The UUID of the author
		 * @returns Array of pages by the specified author
		 * @example
		 * const userPages = await pageModel.findByAuthor('author-uuid');
		 */
		async findByAuthor(authorId: string) {
			return baseModel.findManyWhere([{ where: "authorId", equals: authorId }]);
		},

		/**
		 * Publish a page by setting its status to 'publish' and setting publishedAt
		 * @param id - The UUID of the page to publish
		 * @returns The updated page
		 * @example
		 * const publishedPage = await pageModel.publish('page-uuid');
		 */
		async publish(id: string) {
			return baseModel.update(id, {
				status: "publish",
				publishedAt: new Date(),
			});
		},
	};
}

export function createMediaModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(media, dbInstance);

	return {
		...baseModel,

		/**
		 * Find media by their author
		 * @param authorId - The UUID of the author
		 * @returns Array of media items by the specified author
		 * @example
		 * const userMedia = await mediaModel.findByAuthor('author-uuid');
		 */
		async findByAuthor(authorId: string) {
			return baseModel.findManyWhere([{ where: "authorId", equals: authorId }]);
		},

		/**
		 * Find media by their MIME type
		 * @param mimeType - The MIME type to filter by (e.g., 'image/jpeg', 'video/mp4')
		 * @returns Array of media items with the specified MIME type
		 * @example
		 * const images = await mediaModel.findByMimeType('image/jpeg');
		 */
		async findByMimeType(mimeType: string) {
			return baseModel.findManyWhere([{ where: "mimeType", equals: mimeType }]);
		},
	};
}

export function createThemeModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(themes, dbInstance);
	return {
		...baseModel,
		async findActiveTheme() {
			return baseModel.findFirst([{ where: "status", equals: "active" }]);
		},
		async setActiveTheme(id: string) {
			// Deactivate all themes first
			const allThemes = await baseModel.findMany();
			for (const theme of allThemes) {
				await baseModel.update(theme.id, {
					status: "inactive",
				});
			}
			return baseModel.update(id, { status: "active" });
		},
		async findByName(name: string) {
			return baseModel.findFirst([{ where: "name", equals: name }]);
		},
	};
}

export function createPluginModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(plugins, dbInstance);
	return {
		...baseModel,
		async findActivePlugins() {
			return baseModel.findManyWhere([{ where: "status", equals: "active" }]);
		},
		async findByName(name: string) {
			return baseModel.findFirst([{ where: "name", equals: name }]);
		},
		async activate(id: string) {
			return baseModel.update(id, { status: "active" });
		},
		async deactivate(id: string) {
			return baseModel.update(id, { status: "inactive" });
		},
	};
}

export function createOptionModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(options, dbInstance);
	return {
		...baseModel,
		async getOption(name: string, siteId: string) {
			return baseModel.findFirst([
				{ where: "siteId", equals: siteId },
				{ where: "name", equals: name },
			]);
		},
		async setOption(data: { name: string; value: string; siteId: string }) {
			const existing = await this.getOption(data.name, data.siteId);
			if (existing) {
				return baseModel.update(existing.id, {
					value: data.value,
					updatedAt: new Date(),
				});
			}
			return baseModel.create(data as any);
		},
	};
}

export function createTemplateModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(templates, dbInstance);
	return {
		...baseModel,
		async findByType(type: string) {
			return baseModel.findManyWhere([{ where: "type", equals: type }]);
		},
		async findGlobalTemplates() {
			// Templates don't have isGlobal property, return all templates for now
			return await baseModel.findManyWith({}, {});
		},
		async findActiveTemplates() {
			// Templates don't have isActive property, return all templates for now
			return await baseModel.findManyWith({}, {});
		},
		async findByPriority(_priority: number) {
			// Templates don't have priority property, return empty array for now
			return [];
		},
		async duplicate(id: string, newName: string) {
			const original = await baseModel.findById(id);
			if (!original) {
				throw new Error("Template not found");
			}
			const {
				id: _oldId,
				createdAt: _createdAt,
				updatedAt: _updatedAt,
				...rest
			} = original;
			return baseModel.create({ ...rest, name: newName } as any);
		},
	};
}

export function createRoleModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(roles, dbInstance);
	return {
		...baseModel,
		async findByName(name: string) {
			return baseModel.findFirst([{ where: "name", equals: name }]);
		},
		async findDefaultRoles() {
			return baseModel.findManyWhere([
				{ where: "name", in: ["admin", "editor", "subscriber"] },
			]);
		},
	};
}

export function createUserRoleModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(userRoles, dbInstance);
	return {
		...baseModel,
		async findByUser(userId: string) {
			return baseModel.findManyWhere([{ where: "userId", equals: userId }]);
		},
		async findBySite(siteId: string) {
			return baseModel.findManyWhere([{ where: "siteId", equals: siteId }]);
		},
		async assignRole(userId: string, roleId: string, siteId: string) {
			// Check if role already assigned
			const existing = await baseModel.findFirst([
				{ where: "userId", equals: userId },
				{ where: "roleId", equals: roleId },
				{ where: "siteId", equals: siteId },
			]);

			if (existing) {
				return existing;
			}

			return baseModel.create({ userId, roleId, siteId });
		},
		async removeRole(userId: string, roleId: string, siteId: string) {
			const existing = await baseModel.findFirst([
				{ where: "userId", equals: userId },
				{ where: "roleId", equals: roleId },
				{ where: "siteId", equals: siteId },
			]);

			if (existing) {
				return baseModel.delete(existing.id);
			}
			return null;
		},
	};
}

export function createSiteModel(dbInstance: DatabaseInstance = db) {
	const baseModel = createModel(sites, dbInstance);
	return {
		...baseModel,
		/**
		 * Find the default site marked with isDefault: true
		 * @returns The default site or undefined if none exists
		 */
		async findDefaultSite() {
			return baseModel.findFirst([{ where: "isDefault", equals: true }]);
		},
		/**
		 * Find a site by its name
		 * @param name - The site name
		 * @returns The site or undefined if not found
		 * @example
		 * const site = await siteModel.findByName('My Site');
		 */
		async findByName(name: string) {
			return baseModel.findFirst([{ where: "name", equals: name }]);
		},
		async findByOwner(ownerId: string) {
			return baseModel.findManyWhere([{ where: "ownerId", equals: ownerId }]);
		},

		/** Match a site by hostname derived from sites.siteUrl. */
		async findByHostname(hostname: string) {
			const normalized = hostname.trim().toLowerCase();
			if (!normalized) return undefined;

			const allSites = await baseModel.findMany();
			for (const site of allSites) {
				if (!site.siteUrl) continue;
				const siteHost = normalizeSiteHostname(site.siteUrl);
				if (siteHost === normalized) return site;
			}
			return undefined;
		},
		
		/**
		 * Get site settings merged with defaults
		 * 
		 * Loads settings from default site's settings jsonb column,
		 * deep-merges with default settings to ensure all keys exist.
		 * 
		 * @returns Full settings object
		 * @example
		 * const settings = await siteModel.getSettings();
		 * console.log(settings.general.siteName);
		 */
		async getSettings(siteId?: string) {
			const { DEFAULT_SETTINGS } = await import("@shared/settings-default");
			const { deepMerge } = await import("./utils/deep-merge");

			const site = siteId
				? await baseModel.findById(siteId)
				: await this.findDefaultSite();
			if (!site) {
				return DEFAULT_SETTINGS;
			}

			const storedSettings = site.settings || {};
			return deepMerge(DEFAULT_SETTINGS, storedSettings as any);
		},

		/**
		 * Update site settings with partial changes
		 * 
		 * Loads existing settings, deep-merges partial update,
		 * validates result, and persists to default site.
		 * 
		 * @param partial - Partial settings to merge
		 * @returns Updated full settings object
		 * @example
		 * await siteModel.updateSettings({
		 *   general: { siteName: 'My New Site' }
		 * });
		 */
		async updateSettings(partial: any, siteId?: string) {
			const { DEFAULT_SETTINGS } = await import("@shared/settings-default");
			const { deepMerge } = await import("./utils/deep-merge");
			const { settingsSchema } = await import("@shared/settings-schema");

			const site = siteId
				? await baseModel.findById(siteId)
				: await this.findDefaultSite();
			if (!site) {
				throw new Error("Site not found");
			}

			const currentSettings = site.settings || {};
			const merged = deepMerge(
				deepMerge(DEFAULT_SETTINGS, currentSettings as any),
				partial
			);

			// Validate merged result
			const validated = settingsSchema.parse(merged);

			await baseModel.update(site.id, {
				settings: validated as any,
				updatedAt: new Date(),
			});

			return validated;
		},
	};
}

// Export all models as a simple object (no OOP!)
export const models = {
	// Basic models
	blogs: createModel(blogs, db),
	sessions: createModel(sessions, db),

	// Specialized models
	users: createUserModel(),
	posts: createPostModel(),
	comments: createCommentModel(),
	pages: createPageModel(),
	media: createMediaModel(),
	themes: createThemeModel(),
	plugins: createPluginModel(),
	options: createOptionModel(),
	templates: createTemplateModel(),
	roles: createRoleModel(),
	userRoles: createUserRoleModel(),
	sites: createSiteModel(),
} as const;

// Export individual model factories for transaction usage
export const modelFactories = {
	blogs: (dbInstance: DatabaseInstance) => createModel(blogs, dbInstance),
	sessions: (dbInstance: DatabaseInstance) => createModel(sessions, dbInstance),

	users: createUserModel,
	posts: createPostModel,
	comments: createCommentModel,
	pages: createPageModel,
	media: createMediaModel,
	themes: createThemeModel,
	plugins: createPluginModel,
	options: createOptionModel,
	templates: createTemplateModel,
	roles: createRoleModel,
	userRoles: createUserRoleModel,
	sites: createSiteModel,
} as const;

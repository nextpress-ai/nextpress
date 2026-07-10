import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
	jsonb,
	integer,
	bigint,
	boolean,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name"),
	description: text("description"),
	logoUrl: varchar("logo_url"),
	faviconUrl: varchar("favicon_url"),
	siteUrl: varchar("site_url"),
	ownerId: uuid("owner_id")
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	settings: jsonb("settings").default({}),
	activeThemeId: uuid("active_theme_id").references(() => themes.id),
	/** Marks this site as the default/primary site for the installation */
	isDefault: boolean("is_default").default(false),
	other: jsonb("other").default({}),
});

export const roles = pgTable("roles", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	capabilities: jsonb("capabilities").default(
		[] as { name: string; description: string }[],
	), // [{name: 'publish_posts', description: 'Publish posts'}, {name: 'edit_posts', description: 'Edit posts'}]
	siteId: uuid("site_id").references(() => sites.id),
	other: jsonb("other").default({}),
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name"),
	email: varchar("email").unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	username: varchar("username").unique().notNull(),
	displayUsername: varchar("display_username"),
	password: varchar("password"),
	status: varchar("status").default("active"), // active, inactive, pending
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	other: jsonb("other").default({}),
});

/** Better Auth session store (separate from express-session `sessions` table). */
export const authSessions = pgTable(
	"auth_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		expiresAt: timestamp("expires_at").notNull(),
		token: varchar("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		ipAddress: varchar("ip_address"),
		userAgent: text("user_agent"),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
	},
	(table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

/** Better Auth linked accounts (credential + OAuth providers). */
export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		accountId: varchar("account_id").notNull(),
		providerId: varchar("provider_id").notNull(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("accounts_user_id_idx").on(table.userId)],
);

/** Better Auth verification tokens (email verification, password reset). */
export const verifications = pgTable(
	"verifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		identifier: varchar("identifier").notNull(),
		value: varchar("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("verifications_identifier_idx").on(table.identifier)],
);

/** SDK / MCP API keys — Bearer `npk_live_…` tokens hashed at rest. */
export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name").notNull(),
		keyPrefix: varchar("key_prefix").notNull(),
		keyHash: varchar("key_hash").notNull(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		siteId: uuid("site_id")
			.references(() => sites.id, { onDelete: "cascade" })
			.notNull(),
		scopes: jsonb("scopes").notNull().default([]),
		expiresAt: timestamp("expires_at"),
		lastUsedAt: timestamp("last_used_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
		index("api_keys_user_id_idx").on(table.userId),
	],
);

/** Time-limited share tokens for preview URLs (`npt_…` query param). */
export const previewTokens = pgTable(
	"preview_tokens",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tokenHash: varchar("token_hash").notNull(),
		contentType: varchar("content_type").notNull(),
		contentId: uuid("content_id").notNull(),
		siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
		createdBy: uuid("created_by")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("preview_tokens_token_hash_idx").on(table.tokenHash),
		index("preview_tokens_content_idx").on(table.contentType, table.contentId),
		index("preview_tokens_expires_at_idx").on(table.expiresAt),
	],
);

export const userRoles = pgTable("user_roles", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.references(() => users.id)
		.notNull(),
	roleId: uuid("role_id")
		.references(() => roles.id)
		.notNull(),
	siteId: uuid("site_id")
		.references(() => sites.id)
		.notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const pages = pgTable(
	"pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: varchar("title").notNull(),
		slug: varchar("slug").notNull(),
		siteId: uuid("site_id")
			.references(() => sites.id)
			.notNull(),
		status: varchar("status").default("draft"), // publish, draft, private, trash
		authorId: uuid("author_id")
			.references(() => users.id)
			.notNull(),
		featuredImage: varchar("featured_image"),
		publishedAt: timestamp("published_at"),
		allowComments: boolean("allow_comments").default(true),
		password: varchar("password"),
		parentId: uuid("parent_id"),
		menuOrder: integer("menu_order").default(0),
		templateId: uuid("template_id").references(() => templates.id),
		blocks: jsonb("blocks").default([]),
		version: integer("version").notNull().default(0),
		history: jsonb("history").default([]),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
		other: jsonb("other").default({}),
	},
	(table) => [uniqueIndex("pages_site_slug_unique").on(table.siteId, table.slug)],
);

export const templates = pgTable("templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name").notNull(),
	type: varchar("type").notNull(), // 'header', 'footer', 'page', 'post', 'popup'
	description: text("description"),
	authorId: uuid("author_id")
		.references(() => users.id)
		.notNull(),
	blocks: jsonb("blocks").notNull().default([]),
	settings: jsonb("settings").default({}),
	other: jsonb("other").default({}),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const themes = pgTable("themes", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name").notNull(),
	description: text("description"),
	authorId: uuid("author_id")
		.references(() => users.id)
		.notNull(),
	version: varchar("version").notNull(),
	requires: varchar("requires").notNull(),
	isPaid: boolean("is_paid").default(false),
	price: bigint("price", { mode: "number" }).default(0),
	currency: varchar("currency").default("USD"),
	status: varchar("status").default("draft"),
	renderer: varchar("renderer"), // Optional renderer name (e.g., 'custom-ssr', 'react-ssr')
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	settings: jsonb("settings").default({}),
	other: jsonb("other").default({}),
});

export const plugins = pgTable("plugins", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name").notNull(),
	description: text("description"),
	runsWhen: varchar("runs_when").default("rendering"),
	authorId: uuid("author_id")
		.references(() => users.id)
		.notNull(),
	status: varchar("status").default("inactive"), // active, inactive, pending
	version: varchar("version").notNull(),
	requires: varchar("requires").notNull(),
	isPaid: boolean("is_paid").default(false),
	price: bigint("price", { mode: "number" }).default(0),
	currency: varchar("currency").default("USD"),
	settings: jsonb("settings").default({}),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	other: jsonb("other").default({}),
});

export const options = pgTable(
	"options",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.references(() => sites.id)
			.notNull(),
		name: varchar("name").notNull(),
		value: varchar("value").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
		other: jsonb("other").default({}),
	},
	(table) => [uniqueIndex("options_site_name_unique").on(table.siteId, table.name)],
);

export const blogs = pgTable(
	"blogs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name").notNull(),
		description: text("description"),
		slug: varchar("slug").notNull(),
		status: varchar("status").default("draft"), // publish, draft, private,
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
		siteId: uuid("site_id")
			.references(() => sites.id)
			.notNull(),
		authorId: uuid("author_id")
			.references(() => users.id)
			.notNull(),
		pageId: uuid("page_id").references(() => pages.id),
		settings: jsonb("settings").default({}),
		other: jsonb("other").default({}),
	},
	(table) => [uniqueIndex("blogs_site_slug_unique").on(table.siteId, table.slug)],
);

export const posts = pgTable("posts", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: varchar("title").notNull(),
	slug: varchar("slug").notNull(),
	status: varchar("status").default("draft"), // publish, draft
	authorId: uuid("author_id")
		.references(() => users.id)
		.notNull(),
	featuredImage: varchar("featured_image"),
	excerpt: text("excerpt"),
	publishedAt: timestamp("published_at"),
	allowComments: boolean("allow_comments").default(true),
	password: varchar("password"),
	parentId: uuid("parent_id"),
	templateId: uuid("template_id").references(() => templates.id),
	blocks: jsonb("blocks").default([]),
	version: integer("version").notNull().default(0),
	settings: jsonb("settings").default({}),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	blogId: uuid("blog_id").references(() => blogs.id),
	other: jsonb("other").default({
		categories: [],
		tags: [],
	}),
});

export const comments = pgTable("comments", {
	id: uuid("id").defaultRandom().primaryKey(),
	postId: uuid("post_id")
		.references(() => posts.id)
		.notNull(),
	authorId: uuid("author_id").references(() => users.id),
	authorName: varchar("author_name"),
	authorEmail: varchar("author_email"),
	content: text("content").notNull(),
	status: varchar("status").default("pending"), // approved, pending, spam, trash
	parentId: uuid("parent_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	other: jsonb("other").default({}),
});

export const media = pgTable("media", {
	id: uuid("id").defaultRandom().primaryKey(),
	filename: varchar("filename").notNull(),
	originalName: varchar("original_name").notNull(),
	mimeType: varchar("mime_type").notNull(),
	size: integer("size").notNull(), // Size in bytes
	url: varchar("url").notNull(),
	siteId: uuid("site_id")
		.references(() => sites.id)
		.notNull(),
	authorId: uuid("author_id")
		.references(() => users.id)
		.notNull(),
	alt: varchar("alt"),
	caption: text("caption"),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Todo: add relations and set them with drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
	roles: many(userRoles),
	comments: many(comments),
	authSessions: many(authSessions),
	accounts: many(accounts),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, { fields: [posts.authorId], references: [users.id] }),
	comments: many(comments),
	template: one(templates, {
		fields: [posts.templateId],
		references: [templates.id],
	}),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(users, { fields: [comments.authorId], references: [users.id] }),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "parentComment",
	}),
	children: many(comments, { relationName: "parentComment" }),
}));

export const sessions = pgTable("sessions", {
	sid: varchar("sid").primaryKey(),
	sess: jsonb("sess").notNull(),
	expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const mediaRelations = relations(media, ({ one }) => ({
	author: one(users, { fields: [media.authorId], references: [users.id] }),
}));

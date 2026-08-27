/**
 * Export engine — reads rows out of the database into an ExportFile.
 *
 * Site scoping resolves a site identifier (name or hostname) to a siteId and
 * filters every site-owned table by it. Users and templates are derived:
 * users = site owner + site members + authors of exported content, templates =
 * the ones referenced by exported pages/posts. Unscoped exports include
 * everything.
 */
import { normalizeSiteHostname } from "../utils/validate-domain.js";
import { buildManifest } from "./manifest.js";
import {
	ENTITY_NAMES,
	type EntityName,
	type ExportData,
	type ExportFile,
	type SiteScope,
	type TemplateRow,
	type TransferModels,
	type UserRow,
} from "./types.js";

/** Upper bound for "all rows" reads. Self-hosted installs stay far below this. */
const MAX_EXPORT_ROWS = 100_000;

export interface TransferExporterDeps {
	models: TransferModels;
	appVersion: string;
	/** Where engine warnings go. Defaults to stderr so CLI stdout stays pipe-clean. */
	log?: (message: string) => void;
}

export interface ExportDataOptions {
	/** Entities to include. Undefined = all entities. */
	entities?: EntityName[];
	/** Site identifier (name or hostname). Undefined = all sites. */
	siteSlug?: string;
}

export interface TransferExporter {
	exportData(options: ExportDataOptions): Promise<ExportFile>;
}

/**
 * Create the export engine.
 * @param deps - models, appVersion, optional logger
 * @returns An object with exportData()
 */
export function createTransferExporter(deps: TransferExporterDeps): TransferExporter {
	const log = deps.log ?? ((message: string) => console.error(message));

	async function findAll<T extends { id: string }>(
		model: { findMany(options?: { limit?: number }): Promise<T[]> },
		label: string,
	): Promise<T[]> {
		const rows = await model.findMany({ limit: MAX_EXPORT_ROWS });
		if (rows.length >= MAX_EXPORT_ROWS) {
			log(
				`[transfer] Warning: ${label} hit the ${MAX_EXPORT_ROWS}-row export cap — some rows were not exported.`,
			);
		}
		return rows;
	}

	/** Resolve a site identifier (name or hostname) to a site scope. */
	async function resolveSiteScope(siteSlug: string): Promise<SiteScope> {
		const allSites = await findAll(deps.models.sites, "sites");
		const needle = siteSlug.trim().toLowerCase();
		if (!needle) {
			throw new Error("A site identifier is required after --site.");
		}

		const byName = allSites.find((site) => site.name?.trim().toLowerCase() === needle);
		if (byName) {
			return { id: byName.id, slug: byName.name ?? byName.id };
		}

		const byHostname = allSites.find(
			(site) => site.siteUrl && normalizeSiteHostname(site.siteUrl).toLowerCase() === needle,
		);
		if (byHostname) {
			return { id: byHostname.id, slug: byHostname.name ?? byHostname.id };
		}

		const available = allSites.map((site) => site.name).filter(Boolean).join(", ");
		throw new Error(`No site matches "${siteSlug}". Available sites: ${available || "none"}.`);
	}

	/** Users for a scoped export: site owner + site members + authors of exported content. */
	async function deriveScopedUsers(
		siteRows: { ownerId: string }[],
		userRoleRows: { userId: string }[],
		pageRows: { authorId: string }[],
		postRows: { authorId: string }[],
		commentRows: { authorId: string | null }[],
		mediaRows: { authorId: string }[],
	): Promise<UserRow[]> {
		const ids = new Set<string>();
		for (const site of siteRows) ids.add(site.ownerId);
		for (const userRole of userRoleRows) ids.add(userRole.userId);
		for (const page of pageRows) ids.add(page.authorId);
		for (const post of postRows) ids.add(post.authorId);
		for (const comment of commentRows) {
			if (comment.authorId) ids.add(comment.authorId);
		}
		for (const mediaRow of mediaRows) ids.add(mediaRow.authorId);

		const allUsers = await findAll(deps.models.users, "users");
		return allUsers.filter((user) => ids.has(user.id));
	}

	/** Templates for a scoped export: the ones referenced by exported pages/posts. */
	async function deriveScopedTemplates(
		pageRows: { templateId: string | null }[],
		postRows: { templateId: string | null }[],
	): Promise<TemplateRow[]> {
		const ids = new Set<string>();
		for (const page of pageRows) {
			if (page.templateId) ids.add(page.templateId);
		}
		for (const post of postRows) {
			if (post.templateId) ids.add(post.templateId);
		}

		const allTemplates = await findAll(deps.models.templates, "templates");
		return allTemplates.filter((template) => ids.has(template.id));
	}

	async function exportData(options: ExportDataOptions): Promise<ExportFile> {
		const requested = options.entities ?? [...ENTITY_NAMES];
		const scope = options.siteSlug ? await resolveSiteScope(options.siteSlug) : null;
		const siteScope: SiteScope = scope !== null && scope !== "all" ? scope : "all";
		const scopeId = siteScope !== "all" ? siteScope.id : null;

		// Compute every scoped set up front — users and templates are derived
		// from the content sets, so the content is needed regardless of whether
		// the caller asked for it.
		const scopedSite = scopeId ? await deps.models.sites.findById(scopeId) : undefined;
		const siteRows = scopeId ? (scopedSite ? [scopedSite] : []) : await findAll(deps.models.sites, "sites");

		const userRoleRows = scopeId
			? (await findAll(deps.models.userRoles, "userRoles")).filter((userRole) => userRole.siteId === scopeId)
			: await findAll(deps.models.userRoles, "userRoles");

		const roleIdsFromUserRoles = new Set(userRoleRows.map((userRole) => userRole.roleId));
		const roleRows = scopeId
			? (await findAll(deps.models.roles, "roles")).filter(
					(role) => role.siteId === scopeId || roleIdsFromUserRoles.has(role.id),
				)
			: await findAll(deps.models.roles, "roles");

		const pageRows = scopeId
			? (await findAll(deps.models.pages, "pages")).filter((page) => page.siteId === scopeId)
			: await findAll(deps.models.pages, "pages");

		const blogRows = scopeId
			? (await findAll(deps.models.blogs, "blogs")).filter((blog) => blog.siteId === scopeId)
			: await findAll(deps.models.blogs, "blogs");

		const blogIds = new Set(blogRows.map((blog) => blog.id));
		const postRows = scopeId
			? (await findAll(deps.models.posts, "posts")).filter((post) => post.blogId && blogIds.has(post.blogId))
			: await findAll(deps.models.posts, "posts");

		const postIds = new Set(postRows.map((post) => post.id));
		const commentRows = scopeId
			? (await findAll(deps.models.comments, "comments")).filter((comment) => comment.postId && postIds.has(comment.postId))
			: await findAll(deps.models.comments, "comments");

		const mediaRows = scopeId
			? (await findAll(deps.models.media, "media")).filter((mediaRow) => mediaRow.siteId === scopeId)
			: await findAll(deps.models.media, "media");

		const optionRows = scopeId
			? (await findAll(deps.models.options, "options")).filter((option) => option.siteId === scopeId)
			: await findAll(deps.models.options, "options");

		const userRows = scopeId
			? await deriveScopedUsers(siteRows, userRoleRows, pageRows, postRows, commentRows, mediaRows)
			: await findAll(deps.models.users, "users");

		const templateRows = scopeId
			? await deriveScopedTemplates(pageRows, postRows)
			: await findAll(deps.models.templates, "templates");

		const data: ExportData = {};
		if (requested.includes("users")) data.users = userRows;
		if (requested.includes("sites")) {
			data.sites = { sites: siteRows, roles: roleRows, userRoles: userRoleRows };
		}
		if (requested.includes("pages")) data.pages = pageRows;
		if (requested.includes("blogs")) data.blogs = blogRows;
		if (requested.includes("posts")) data.posts = postRows;
		if (requested.includes("comments")) data.comments = commentRows;
		if (requested.includes("media")) data.media = mediaRows;
		if (requested.includes("templates")) data.templates = templateRows;
		if (requested.includes("options")) data.options = optionRows;

		const entityCounts: Partial<Record<EntityName, number>> = {};
		if (data.users) entityCounts.users = data.users.length;
		if (data.sites) entityCounts.sites = data.sites.sites.length;
		if (data.pages) entityCounts.pages = data.pages.length;
		if (data.blogs) entityCounts.blogs = data.blogs.length;
		if (data.posts) entityCounts.posts = data.posts.length;
		if (data.comments) entityCounts.comments = data.comments.length;
		if (data.media) entityCounts.media = data.media.length;
		if (data.templates) entityCounts.templates = data.templates.length;
		if (data.options) entityCounts.options = data.options.length;

		const manifest = buildManifest({
			appVersion: deps.appVersion,
			siteScope,
			entityCounts,
			includesMediaFiles: false,
		});

		log(
			`[transfer] Exported ${Object.entries(entityCounts)
				.map(([entity, count]) => `${entity}=${count}`)
				.join(" ")}`,
		);

		return { manifest, data };
	}

	return { exportData };
}
/**
 * Types for the NextPress data transfer engine (export/import).
 *
 * One export file is a single JSON document `{ manifest, data }` where `data`
 * holds one key per entity. The `sites` entity bundles three tables
 * (sites + roles + userRoles) because roles and userRoles only make sense
 * alongside their site. Media rows are metadata only; the binary files are
 * bundled separately by tar-bundle.ts when `--with-media-files` is used.
 */
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { ModelOperations } from "@shared/create-models";
import type {
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

export const ENTITY_NAMES = [
	"users",
	"sites",
	"pages",
	"blogs",
	"posts",
	"comments",
	"media",
	"templates",
	"options",
] as const;

export type EntityName = (typeof ENTITY_NAMES)[number];

export type UserRow = InferSelectModel<typeof users>;
export type SiteRow = InferSelectModel<typeof sites>;
export type RoleRow = InferSelectModel<typeof roles>;
export type UserRoleRow = InferSelectModel<typeof userRoles>;
export type PageRow = InferSelectModel<typeof pages>;
export type BlogRow = InferSelectModel<typeof blogs>;
export type PostRow = InferSelectModel<typeof posts>;
export type CommentRow = InferSelectModel<typeof comments>;
export type MediaRow = InferSelectModel<typeof media>;
export type TemplateRow = InferSelectModel<typeof templates>;
export type OptionRow = InferSelectModel<typeof options>;

type UserInsert = InferInsertModel<typeof users>;
type SiteInsert = InferInsertModel<typeof sites>;
type RoleInsert = InferInsertModel<typeof roles>;
type UserRoleInsert = InferInsertModel<typeof userRoles>;
type PageInsert = InferInsertModel<typeof pages>;
type BlogInsert = InferInsertModel<typeof blogs>;
type PostInsert = InferInsertModel<typeof posts>;
type CommentInsert = InferInsertModel<typeof comments>;
type MediaInsert = InferInsertModel<typeof media>;
type TemplateInsert = InferInsertModel<typeof templates>;
type OptionInsert = InferInsertModel<typeof options>;

/** The subset of model operations the transfer engine needs per table. */
type TransferModelOps<TSelect extends { id: string }, TInsert> = Pick<
	ModelOperations<TSelect, TInsert>,
	"findMany" | "findById" | "create" | "update"
>;

/** Model handles the engine reads from and writes to. Injected so tests can point at PGlite. */
export interface TransferModels {
	users: TransferModelOps<UserRow, UserInsert>;
	sites: TransferModelOps<SiteRow, SiteInsert>;
	roles: TransferModelOps<RoleRow, RoleInsert>;
	userRoles: TransferModelOps<UserRoleRow, UserRoleInsert>;
	pages: TransferModelOps<PageRow, PageInsert>;
	blogs: TransferModelOps<BlogRow, BlogInsert>;
	posts: TransferModelOps<PostRow, PostInsert>;
	comments: TransferModelOps<CommentRow, CommentInsert>;
	media: TransferModelOps<MediaRow, MediaInsert>;
	templates: TransferModelOps<TemplateRow, TemplateInsert>;
	options: TransferModelOps<OptionRow, OptionInsert>;
}

/** Rows for the `sites` entity — three tables bundled together. */
export interface SiteEntityData {
	sites: SiteRow[];
	roles: RoleRow[];
	userRoles: UserRoleRow[];
}

/** One key per entity. `sites` bundles sites + roles + userRoles. */
export interface ExportData {
	users?: UserRow[];
	sites?: SiteEntityData;
	pages?: PageRow[];
	blogs?: BlogRow[];
	posts?: PostRow[];
	comments?: CommentRow[];
	media?: MediaRow[];
	templates?: TemplateRow[];
	options?: OptionRow[];
}

/** What part of the installation an export covers. */
export type SiteScope = "all" | { id: string; slug: string };

export interface ExportManifest {
	format: "nextpress-export";
	formatVersion: 1;
	appVersion: string;
	exportedAt: string;
	siteScope: SiteScope;
	entityCounts: Partial<Record<EntityName, number>>;
	includesMediaFiles: boolean;
}

export interface ExportFile {
	manifest: ExportManifest;
	data: ExportData;
}

export type ImportMode = "overwrite" | "skip";

export interface EntityImportSummary {
	created: number;
	updated: number;
	skipped: number;
	/** Humanized per-row failures. Import never aborts for one bad row. */
	errors: string[];
}

/** Per-entity import results. Only entities actually imported get an entry. */
export type ImportSummary = Partial<Record<EntityName, EntityImportSummary>>;
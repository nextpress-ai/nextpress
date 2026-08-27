/**
 * Import engine — writes an ExportFile back into the database.
 *
 * Rows are upserted by UUID. `overwrite` updates existing rows, `skip` leaves
 * them alone. Tables are written in fixed FK order (users → sites → roles →
 * userRoles → templates → pages → blogs → posts → comments → media → options)
 * and self-referencing tables (pages.parentId, comments.parentId) are ordered
 * parents-before-children. One bad row never aborts the import: it is logged
 * with full context, recorded in the summary, and the rest continues. A bad
 * manifest, however, throws before anything touches the database.
 */
import { collectErrorText } from "../utils.js";
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
import { validateExportFile } from "./manifest.js";
import {
	ENTITY_NAMES,
	type EntityImportSummary,
	type EntityName,
	type ExportData,
	type ExportFile,
	type ImportMode,
	type ImportSummary,
	type SiteEntityData,
	type TransferModels,
} from "./types.js";

/** Table-level FK order. The `sites` entity expands to sites → roles → userRoles. */
export const IMPORT_ORDER: readonly EntityName[] = [
	"users",
	"sites",
	"templates",
	"pages",
	"blogs",
	"posts",
	"comments",
	"media",
	"options",
];

export interface TransferImporterDeps {
	models: TransferModels;
	/** Where per-row failure details go. Defaults to stderr. */
	log?: (message: string) => void;
}

export interface ImportDataOptions {
	exportFile: ExportFile;
	/** Entities to import. Undefined = every entity present in the file. */
	entities?: EntityName[];
	mode: ImportMode;
}

export interface TransferImporter {
	importData(options: ImportDataOptions): Promise<ImportSummary>;
}

/** Plain-word label for humans in error messages. */
const ENTITY_LABELS: Record<EntityName, string> = {
	users: "user",
	sites: "site",
	pages: "page",
	blogs: "blog",
	posts: "post",
	comments: "comment",
	media: "media item",
	templates: "template",
	options: "setting",
};

/** The model surface importRow needs. Generic over the row type. */
interface ImportRowModel<T extends { id: string }> {
	findById(id: string): Promise<T | undefined>;
	create(data: T): Promise<T>;
	update(id: string, data: Partial<T>): Promise<T>;
}

/** Timestamp column names per entity, read from the drizzle schema metadata. */
function collectDateColumns(table: object): Set<string> {
	const cols = new Set<string>();
	for (const [name, column] of Object.entries(table)) {
		if (
			typeof column === "object" &&
			column !== null &&
			"dataType" in column &&
			(column as { dataType: string }).dataType === "date"
		) {
			cols.add(name);
		}
	}
	return cols;
}

/** Every table the engine writes to — entities plus the two tables bundled under `sites`. */
type TransferTableName = EntityName | "roles" | "userRoles";

const DATE_COLUMNS: Record<TransferTableName, ReadonlySet<string>> = {
	users: collectDateColumns(users),
	sites: collectDateColumns(sites),
	roles: collectDateColumns(roles),
	userRoles: collectDateColumns(userRoles),
	pages: collectDateColumns(pages),
	blogs: collectDateColumns(blogs),
	posts: collectDateColumns(posts),
	comments: collectDateColumns(comments),
	media: collectDateColumns(media),
	templates: collectDateColumns(templates),
	options: collectDateColumns(options),
};

/**
 * JSON serialization turns Date values into ISO strings; the drivers expect
 * Date objects back. Revive the entity's timestamp columns before insert.
 */
function reviveDates<T extends { id: string }>(row: T, dateCols: ReadonlySet<string>): T {
	const revived = { ...row };
	for (const col of dateCols) {
		const value = revived[col as keyof T];
		if (typeof value === "string") {
			revived[col as keyof T] = new Date(value) as T[keyof T];
		}
	}
	return revived;
}

/** Map common database failure codes to plain-language reasons. */
function humanizeRowError(label: string, rowId: string, error: unknown): string {
	const text = collectErrorText(error);
	let reason = "it could not be saved";
	if (/23505|duplicate key|already exists/i.test(text)) {
		reason = "a record with the same unique value already exists";
	} else if (/23503|foreign key/i.test(text)) {
		reason = "a related record it depends on is missing";
	} else if (/23502|null value/i.test(text)) {
		reason = "a required field is missing";
	}
	return `Could not import ${label} "${rowId}": ${reason}.`;
}

/**
 * Order rows so parents come before children (pages.parentId, comments.parentId).
 * Rows without a parentId (or whose parent is outside the exported set) keep
 * their relative order — a dangling parent is left as-is, never a crash.
 */
function orderParentsFirst<T extends { id: string }>(rows: T[]): T[] {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const inSet = new Set(rows.map((row) => row.id));
	const ordered: T[] = [];
	const visited = new Set<string>();

	const visit = (row: T): void => {
		if (visited.has(row.id)) return;
		visited.add(row.id);
		const parentId = (row as { parentId?: string | null }).parentId;
		const parent = parentId ? byId.get(parentId) : undefined;
		if (parent && inSet.has(parent.id)) visit(parent);
		ordered.push(row);
	};

	for (const row of rows) visit(row);
	return ordered;
}

/**
 * Create the import engine.
 * @param deps - models, optional logger
 * @returns An object with importData()
 */
export function createTransferImporter(deps: TransferImporterDeps): TransferImporter {
	const log = deps.log ?? ((message: string) => console.error(message));

	async function importRow<T extends { id: string }>(
		entity: EntityName,
		label: string,
		model: NoInfer<ImportRowModel<T>>,
		row: T,
		mode: ImportMode,
		entry: EntityImportSummary,
		dateCols: ReadonlySet<string>,
	): Promise<void> {
		try {
			const revived = reviveDates(row, dateCols);
			const existing = await model.findById(revived.id);
			if (existing) {
				if (mode === "overwrite") {
					await model.update(revived.id, revived);
					entry.updated += 1;
				} else {
					entry.skipped += 1;
				}
				return;
			}
			await model.create(revived);
			entry.created += 1;
		} catch (error) {
			// Never abort the whole import for one bad row — log with context and continue.
			log(
				`[transfer] import ${entity} row ${row.id} failed: ${collectErrorText(error)} (atFunction: importRow)`,
			);
			entry.errors.push(humanizeRowError(label, row.id, error));
		}
	}

	async function importEntityRows<T extends { id: string }>(
		entity: EntityName,
		model: NoInfer<ImportRowModel<T>>,
		rows: T[],
		mode: ImportMode,
		summary: ImportSummary,
	): Promise<void> {
		const entry = ensureSummaryEntry(summary, entity);
		for (const row of orderParentsFirst(rows)) {
			await importRow(entity, ENTITY_LABELS[entity], model, row, mode, entry, DATE_COLUMNS[entity]);
		}
	}

	async function importSites(
		siteData: SiteEntityData,
		mode: ImportMode,
		summary: ImportSummary,
	): Promise<void> {
		const entry = ensureSummaryEntry(summary, "sites");
		for (const row of siteData.sites) {
			await importRow("sites", "site", deps.models.sites, row, mode, entry, DATE_COLUMNS.sites);
		}
		for (const row of siteData.roles) {
			await importRow("sites", "role", deps.models.roles, row, mode, entry, DATE_COLUMNS.roles);
		}
		for (const row of siteData.userRoles) {
			await importRow(
				"sites",
				"user role",
				deps.models.userRoles,
				row,
				mode,
				entry,
				DATE_COLUMNS.userRoles,
			);
		}
	}

	function ensureSummaryEntry(summary: ImportSummary, entity: EntityName): EntityImportSummary {
		const existing = summary[entity];
		if (existing) return existing;
		const entry: EntityImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
		summary[entity] = entry;
		return entry;
	}

	async function importData(options: ImportDataOptions): Promise<ImportSummary> {
		// Validate before any DB work — a bad file must never touch the database.
		const exportFile = validateExportFile(options.exportFile);
		const mode = options.mode;
		const summary: ImportSummary = {};
		const requested = new Set(options.entities ?? [...ENTITY_NAMES]);
		const data = exportFile.data;

		if (requested.has("users") && data.users) {
			await importEntityRows("users", deps.models.users, data.users, mode, summary);
		}
		if (requested.has("sites") && data.sites) {
			await importSites(data.sites, mode, summary);
		}
		if (requested.has("templates") && data.templates) {
			await importEntityRows("templates", deps.models.templates, data.templates, mode, summary);
		}
		if (requested.has("pages") && data.pages) {
			await importEntityRows("pages", deps.models.pages, data.pages, mode, summary);
		}
		if (requested.has("blogs") && data.blogs) {
			await importEntityRows("blogs", deps.models.blogs, data.blogs, mode, summary);
		}
		if (requested.has("posts") && data.posts) {
			await importEntityRows("posts", deps.models.posts, data.posts, mode, summary);
		}
		if (requested.has("comments") && data.comments) {
			await importEntityRows("comments", deps.models.comments, data.comments, mode, summary);
		}
		if (requested.has("media") && data.media) {
			await importEntityRows("media", deps.models.media, data.media, mode, summary);
		}
		if (requested.has("options") && data.options) {
			await importEntityRows("options", deps.models.options, data.options, mode, summary);
		}

		return summary;
	}

	return { importData };
}
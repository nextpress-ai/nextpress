import type { BlockConfig } from "./domain.js";

export type WordPressEntity = "posts" | "pages" | "media" | "comments" | "users";

export type FeaturedImageMode = "reference" | "copy";

export type WpPostPreview = {
	wpId: number;
	title: string;
	slug: string;
	status: string;
	date: string;
	link: string;
};

export type WpApiErrorCode =
	| "connection_failed"
	| "not_wordpress"
	| "rest_blocked"
	| "no_posts"
	| "invalid_url"
	| "timeout";

export type WpDiscoverResult = {
	ok: boolean;
	baseUrl: string;
	siteName?: string;
	error?: {
		code: WpApiErrorCode;
		message: string;
		hint: string;
	};
	entities: Partial<
		Record<WordPressEntity, { supported: boolean; total: number; reachable: boolean }>
	>;
};

export type WpImportStatusResponse = {
	imported: Record<string, { nextpressId: string }>;
};

export type WpListResult = {
	items: WpPostPreview[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
};

export type ImportItemResult =
	| { wpId: number; status: "imported"; postId: string; title: string }
	| { wpId: number; status: "updated"; postId: string; title: string }
	| { wpId: number; status: "skipped"; reason: string }
	| { wpId: number; status: "failed"; reason: string };

export type ImportBatchResult = {
	imported: Extract<ImportItemResult, { status: "imported" }>[];
	updated: Extract<ImportItemResult, { status: "updated" }>[];
	skipped: Extract<ImportItemResult, { status: "skipped" }>[];
	failed: Extract<ImportItemResult, { status: "failed" }>[];
};

export type MappedPageImportResult = ImportBatchResult & {
	pages?: Array<{ wpId: number; pageId: string; title: string }>;
};

/** WordPress list API response shape used by import list endpoints. */
export type WpImportListResponse = WpListResult & {
	baseUrl?: string;
};

/** WordPress import POST response for posts/pages batches. */
export type WpImportRunResponse = ImportBatchResult | MappedPageImportResult;

export type { BlockConfig };

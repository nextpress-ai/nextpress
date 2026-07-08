import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { wpDiscoverSchema, wpImportPagesSchema, wpImportPostsSchema } from "../schemas/index.js";
import type { WpDiscoverInput, WpImportPagesInput, WpImportPostsInput } from "../types/inputs.js";
import type {
	ImportBatchResult,
	WpDiscoverResult,
	WpImportListResponse,
	WpImportRunResponse,
	WpImportStatusResponse,
} from "../types/wordpress-import.js";

export type ImportResource = {
	/** Probe a WordPress site for importable content before committing. */
	discover: (input: WpDiscoverInput) => Promise<WpDiscoverResult>;
	/** Preview remote posts so the user can pick what to import. */
	listPosts: (params: {
		baseUrl: string;
		page?: number;
		per_page?: number;
	}) => Promise<WpImportListResponse>;
	/** Batch-import selected posts into the NextPress install. */
	importPosts: (input: WpImportPostsInput) => Promise<ImportBatchResult>;
	/** Preview remote pages so the user can pick what to import. */
	listPages: (params: {
		baseUrl: string;
		page?: number;
		per_page?: number;
	}) => Promise<WpImportListResponse>;
	/** Batch-import selected pages into the NextPress install. */
	importPages: (input: WpImportPagesInput) => Promise<WpImportRunResponse>;
	/** Poll long-running import jobs without blocking the UI thread. */
	status: (params: {
		baseUrl: string;
		entity: "posts" | "pages";
	}) => Promise<WpImportStatusResponse>;
};

/** WordPress import — discover, preview, import, and status (Tools → Import WordPress). */
export function createImportResource({ http }: { http: HttpClient }): ImportResource {
	return {
		/** Probe a WordPress site for importable content before committing. */
		discover: async (input: WpDiscoverInput): Promise<WpDiscoverResult> => {
			const body = parseInput({
				schema: wpDiscoverSchema,
				input,
				label: "import.discover input",
			});
			return http.request("/api/import/wordpress/discover", { method: "POST", body });
		},

		/** Preview remote posts so the user can pick what to import. */
		listPosts: async (params: {
			baseUrl: string;
			page?: number;
			per_page?: number;
		}): Promise<WpImportListResponse> =>
			http.request("/api/import/wordpress/posts", { query: params }),

		/** Batch-import selected posts into the NextPress install. */
		importPosts: async (input: WpImportPostsInput): Promise<ImportBatchResult> => {
			const body = parseInput({
				schema: wpImportPostsSchema,
				input,
				label: "import.importPosts input",
			});
			return http.request("/api/import/wordpress/posts", { method: "POST", body });
		},

		/** Preview remote pages so the user can pick what to import. */
		listPages: async (params: {
			baseUrl: string;
			page?: number;
			per_page?: number;
		}): Promise<WpImportListResponse> =>
			http.request("/api/import/wordpress/pages", { query: params }),

		/** Batch-import selected pages into the NextPress install. */
		importPages: async (input: WpImportPagesInput): Promise<WpImportRunResponse> => {
			const body = parseInput({
				schema: wpImportPagesSchema,
				input,
				label: "import.importPages input",
			});
			return http.request("/api/import/wordpress/pages", { method: "POST", body });
		},

		/** Poll long-running import jobs without blocking the UI thread. */
		status: async (params: {
			baseUrl: string;
			entity: "posts" | "pages";
		}): Promise<WpImportStatusResponse> =>
			http.request("/api/import/wordpress/status", { query: params }),
	};
}

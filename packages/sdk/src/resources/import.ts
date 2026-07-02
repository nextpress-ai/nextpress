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

/** WordPress import — discover, preview, import, and status (Tools → Import WordPress). */
export function createImportResource({ http }: { http: HttpClient }) {
	return {
		discover: async (input: WpDiscoverInput): Promise<WpDiscoverResult> => {
			const body = parseInput({
				schema: wpDiscoverSchema,
				input,
				label: "import.discover input",
			});
			return http.request("/api/import/wordpress/discover", { method: "POST", body });
		},

		listPosts: async (params: {
			baseUrl: string;
			page?: number;
			per_page?: number;
		}): Promise<WpImportListResponse> =>
			http.request("/api/import/wordpress/posts", { query: params }),

		importPosts: async (input: WpImportPostsInput): Promise<ImportBatchResult> => {
			const body = parseInput({
				schema: wpImportPostsSchema,
				input,
				label: "import.importPosts input",
			});
			return http.request("/api/import/wordpress/posts", { method: "POST", body });
		},

		listPages: async (params: {
			baseUrl: string;
			page?: number;
			per_page?: number;
		}): Promise<WpImportListResponse> =>
			http.request("/api/import/wordpress/pages", { query: params }),

		importPages: async (input: WpImportPagesInput): Promise<WpImportRunResponse> => {
			const body = parseInput({
				schema: wpImportPagesSchema,
				input,
				label: "import.importPages input",
			});
			return http.request("/api/import/wordpress/pages", { method: "POST", body });
		},

		status: async (params: {
			baseUrl: string;
			entity: "posts" | "pages";
		}): Promise<WpImportStatusResponse> =>
			http.request("/api/import/wordpress/status", { query: params }),
	};
}

export type ImportResource = ReturnType<typeof createImportResource>;

import type { HttpClient } from "../client/http-client.js";
import { safeHttpRequest } from "../client/safe-request.js";
import type { SdkResult } from "../client/sdk-result.js";
import { parseInput } from "../client/validate-input.js";
import {
	exportPageSchema,
	importPageSchema,
	pageTransferLinksSchema,
} from "../schemas/page-transfer.js";
import type { DownloadedFile } from "../types/client.js";
import type {
	ExportPageInput,
	ImportPageInput,
	PageTransferFile,
	PageTransferImportResult,
	PageTransferLinks,
} from "../types/page-transfer.js";

const PAGE_TRANSFER_PATH = "/api/page-transfer";

/** Used only if a server sends a page file without a name. */
const FALLBACK_FILE_NAME = "page.nextpress-page.json";

export type PageTransferResource = {
	/**
	 * List the pages a page links to (and what those link to). Call it before `export` to choose
	 * which linked pages travel along, and read `missing` for links that point at no page.
	 */
	links: (params: { pageId: string }) => Promise<PageTransferLinks>;
	/**
	 * Download a page as a page file: the page, the files it uses and (optionally) the pages it
	 * links to. Hand `bytes` and `fileName` to `import` on another site to copy the page there.
	 * Pass `files: false` for a small file with no images or videos; with files it can be tens of
	 * megabytes, so raise the client's `timeout` if big pages time out.
	 */
	export: (input: ExportPageInput) => Promise<PageTransferFile>;
	/**
	 * Create a draft page (and any linked pages in the file) on this site from a page file. Use it
	 * to move pages between sites. A page address already taken here gets a new one, and links to
	 * it follow. Returns a result: a refused file comes back as an error value, not a throw.
	 *
	 * The editor's paste helper (`POST /api/page-transfer/files`, which stores the files of copied
	 * blocks) is left out: it only serves copy and paste inside the dashboard.
	 */
	import: (input: ImportPageInput) => Promise<SdkResult<PageTransferImportResult>>;
};

const toBlob = (file: Blob | Uint8Array | string): Blob =>
	file instanceof Blob ? file : new Blob([file], { type: "application/json" });

/** Moving pages between NextPress sites: linked pages, page file export and import. */
export function createPageTransferResource({ http }: { http: HttpClient }): PageTransferResource {
	return {
		links: async ({ pageId }: { pageId: string }): Promise<PageTransferLinks> => {
			parseInput({
				schema: pageTransferLinksSchema,
				input: { pageId },
				label: "pageTransfer.links input",
			});
			return http.request(`${PAGE_TRANSFER_PATH}/pages/${pageId}/links`);
		},

		export: async (input: ExportPageInput): Promise<PageTransferFile> => {
			const { pageId, files, include } = parseInput({
				schema: exportPageSchema,
				input,
				label: "pageTransfer.export input",
			});
			// The server only skips files for the exact text "0", so booleans are sent as 1 or 0.
			const query = {
				...(files === undefined ? {} : { files: files ? "1" : "0" }),
				...(include && include.length > 0 ? { include: include.join(",") } : {}),
			};
			const file = await http.request<DownloadedFile>(
				`${PAGE_TRANSFER_PATH}/pages/${pageId}/export`,
				{ query, responseType: "file" },
			);
			return {
				bytes: file.bytes,
				fileName: file.fileName ?? FALLBACK_FILE_NAME,
				contentType: file.contentType,
			};
		},

		import: async (input: ImportPageInput): Promise<SdkResult<PageTransferImportResult>> => {
			const parsed = parseInput({
				schema: importPageSchema,
				input,
				label: "pageTransfer.import input",
			});
			const formData = new FormData();
			formData.append("package", toBlob(parsed.file), parsed.fileName);
			if (parsed.includeTheme) formData.append("includeTheme", "true");
			if (parsed.publish) formData.append("publish", "true");
			return safeHttpRequest(http, `${PAGE_TRANSFER_PATH}/import`, {
				method: "POST",
				body: formData,
				query: parsed.siteId ? { siteId: parsed.siteId } : undefined,
			});
		},
	};
}

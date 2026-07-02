import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { createPreviewTokenSchema, idParamSchema } from "../schemas/index.js";
import type { Page, Post, PreviewShareToken, Template } from "../types/domain.js";

type PreviewContentType = "page" | "post" | "template";

/** Creates the preview resource for draft/preview rendering and share links. */
export function createPreviewResource({
	http,
	baseUrl,
}: {
	http: HttpClient;
	baseUrl: string;
}) {
	const buildSharePreviewUrl = ({
		contentType,
		contentId,
		token,
	}: {
		contentType: PreviewContentType;
		contentId: string;
		token: string;
	}) =>
		`${baseUrl.replace(/\/+$/, "")}/preview/${contentType}/${contentId}?token=${encodeURIComponent(token)}`;

	return {
		/** Preview a post by UUID (requires API key or session). */
		post: async ({ id }: { id: string }): Promise<Post> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "preview.post id" });
			return http.request(`/api/preview/post/${id}`);
		},

		/** Preview a page by UUID (requires API key or session). */
		page: async ({ id }: { id: string }): Promise<Page> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "preview.page id" });
			return http.request(`/api/preview/page/${id}`);
		},

		/** Preview a template by UUID (requires API key or session). */
		template: async ({ id }: { id: string }): Promise<Template> => {
			parseInput({
				schema: idParamSchema,
				input: { id },
				label: "preview.template id",
			});
			return http.request(`/api/preview/template/${id}`);
		},

		/**
		 * Create an expiring preview share token (default 5 minutes).
		 * Opens in browser without login via `?token=` on the preview URL.
		 */
		createShareToken: async (input: {
			contentType: PreviewContentType;
			contentId: string;
			expiresInSeconds?: number;
			siteId?: string;
		}): Promise<PreviewShareToken> => {
			const body = parseInput({
				schema: createPreviewTokenSchema,
				input,
				label: "preview.createShareToken input",
			});
			const result = await http.request<PreviewShareToken>("/api/preview/tokens", {
				method: "POST",
				body,
			});
			return {
				...result,
				previewUrl:
					result.previewUrl ??
					buildSharePreviewUrl({
						contentType: body.contentType,
						contentId: body.contentId,
						token: result.token,
					}),
			};
		},

		/** Fetch preview content via share token (no auth header required). */
		getShared: async ({
			contentType,
			id,
			token,
		}: {
			contentType: PreviewContentType;
			id: string;
			token: string;
		}): Promise<Page | Post | Template> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "preview.getShared id" });
			if (!token.startsWith("npt_")) {
				throw new Error("Invalid preview token");
			}
			if (!["page", "post", "template"].includes(contentType)) {
				throw new Error("Invalid content type");
			}
			return http.request(`/api/preview/shared/${contentType}/${id}?token=${encodeURIComponent(token)}`, {
				auth: false,
			});
		},

		buildSharePreviewUrl,
	};
}

export type PreviewResource = ReturnType<typeof createPreviewResource>;

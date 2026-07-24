import { z } from "zod";
import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Draft preview share links. */
export function registerPreviewTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"preview_page",
		{
			title: "Preview page",
			description:
				"Mint a time-limited share URL so humans can review a draft without logging in.",
			inputSchema: {
				id: z.string().min(1).describe("Page UUID"),
				expiresInSeconds: z
					.number()
					.int()
					.min(60)
					.max(3600)
					.optional()
					.describe("Token lifetime in seconds (max 3600)"),
			},
		},
		async ({ id, expiresInSeconds }) =>
			runTool(async () => {
				const token = await client.preview.createShareToken({
					contentType: "page",
					contentId: id,
					expiresInSeconds: expiresInSeconds ?? 3600,
				});
				return formatJson({
					...token,
					previewUrl:
						token.previewUrl ||
						client.preview.buildSharePreviewUrl({
							contentType: "page",
							contentId: id,
							token: token.token,
						}),
				});
			}),
	);
}

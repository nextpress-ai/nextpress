import { z } from "zod";
import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Media list/upload. */
export function registerMediaTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_media",
		{
			title: "List media",
			description: "Browse the media library.",
			inputSchema: {
				page: z.number().int().min(1).optional(),
				per_page: z.number().int().min(1).max(100).optional(),
			},
		},
		async (args) => runTool(async () => formatJson(await client.media.list(args))),
	);

	server.registerTool(
		"upload_media",
		{
			title: "Upload media",
			description:
				"Upload a file from a local path (stdio host) or base64. Prefer path when the agent can read the filesystem.",
			inputSchema: {
				path: z.string().optional().describe("Local filesystem path"),
				base64: z.string().optional().describe("Base64 file bytes (without data: prefix)"),
				filename: z.string().optional().describe("Required when using base64"),
				mimeType: z.string().optional(),
				alt: z.string().optional(),
				caption: z.string().optional(),
				description: z.string().optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const file = await resolveUploadBlob(args);
				const media = await client.media.upload({
					file,
					alt: args.alt,
					caption: args.caption,
					description: args.description,
				});
				return formatJson(media);
			}),
	);
}

async function resolveUploadBlob(args: {
	path?: string;
	base64?: string;
	filename?: string;
	mimeType?: string;
}): Promise<Blob> {
	if (args.path) {
		const { readFile } = await import("node:fs/promises");
		const { basename } = await import("node:path");
		const bytes = await readFile(args.path);
		const type = args.mimeType ?? guessMime(args.path);
		return new File([bytes], basename(args.path), { type });
	}
	if (args.base64) {
		const filename = args.filename ?? "upload.bin";
		const type = args.mimeType ?? "application/octet-stream";
		const bytes = Buffer.from(args.base64, "base64");
		return new File([bytes], filename, { type });
	}
	throw new Error("upload_media requires path or base64");
}

function guessMime(path: string): string {
	const lower = path.toLowerCase();
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
	if (lower.endsWith(".gif")) return "image/gif";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".svg")) return "image/svg+xml";
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".mp4")) return "video/mp4";
	return "application/octet-stream";
}

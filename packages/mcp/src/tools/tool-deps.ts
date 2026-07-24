import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextpressClient } from "@nextpress-org/sdk";
import { z } from "zod";
import type { BlockBuildNode } from "../build-blocks.js";

export type ToolDeps = {
	server: McpServer;
	client: NextpressClient;
};

/** Zod schema for agent-friendly block builder nodes (recursive). */
export const blockBuildNodeSchema: z.ZodType<BlockBuildNode> = z.lazy(() =>
	z.object({
		name: z.string().min(1),
		text: z.string().optional(),
		level: z.number().int().min(1).max(6).optional(),
		url: z.string().optional(),
		alt: z.string().optional(),
		label: z.string().optional(),
		children: z.array(blockBuildNodeSchema).optional(),
		settings: z
			.object({
				content: z.record(z.unknown()).optional(),
				styles: z.record(z.string()).optional(),
				advanced: z.record(z.unknown()).optional(),
			})
			.optional(),
	}),
);

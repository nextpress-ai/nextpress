import {
	isNextpressError,
	VERSION_STALE,
	type SdkResult,
} from "@nextpress-org/sdk";

export type McpTextResult = {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
};

/**
 * Serialize a successful value for MCP tool responses.
 */
export function formatJson(value: unknown): McpTextResult {
	return {
		content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
	};
}

/**
 * Map SdkResult mutations (and thrown errors) into MCP content with clear conflict guidance.
 */
export function formatSdkResult<T>(result: SdkResult<T>): McpTextResult {
	if (result.isOk) {
		return formatJson(result.value);
	}
	return formatError(result.error);
}

/**
 * Map thrown or wrapped failures into agent-readable MCP errors.
 */
export function formatError(error: unknown): McpTextResult {
	if (isNextpressError(error)) {
		const staleHint =
			error.code === VERSION_STALE
				? " Version conflict: re-fetch with get_page/get_post, then retry update with the new expectedVersion. Do not overwrite without re-reading."
				: "";
		const payload = {
			error: true,
			message: error.message,
			status: error.status,
			code: error.code,
			body: error.body,
			hint: staleHint.trim() || undefined,
		};
		return {
			content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
			isError: true,
		};
	}

	const message = error instanceof Error ? error.message : String(error);
	return {
		content: [{ type: "text", text: JSON.stringify({ error: true, message }, null, 2) }],
		isError: true,
	};
}

/**
 * Run an async tool body and always return MCP-shaped content.
 */
export async function runTool(fn: () => Promise<McpTextResult>): Promise<McpTextResult> {
	try {
		return await fn();
	} catch (error) {
		return formatError(error);
	}
}

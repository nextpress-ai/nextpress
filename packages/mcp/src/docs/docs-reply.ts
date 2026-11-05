import { isNextpressError, type SdkResult } from "@nextpress-org/sdk";
import type { McpTextResult } from "../format-result.js";
import { logError } from "../log-error.js";

/** Said when the server gave no clear answer. The cause is in the log, not in the reply. */
const TRY_AGAIN = "Couldn't finish that. Please try again.";

/** No reply at all (0), a timeout (408), or a server fault: the agent cannot fix these by changing its request. */
const isUnclear = (status: number): boolean => status === 0 || status === 408 || status >= 500;

const asSentence = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);

/** A reply that worked, in plain words. */
export const docsText = (text: string): McpTextResult => ({
	content: [{ type: "text", text }],
});

/** A reply that did not work, in plain words, for the agent to act on. */
export const docsFailure = (text: string): McpTextResult => ({
	content: [{ type: "text", text }],
	isError: true,
});

/** The value of a call that worked. A refused call is thrown, so `runDocsTool` logs it and says why. */
export function valueOrThrow<T>(result: SdkResult<T>): T {
	if (result.isErr) throw result.error;
	return result.value;
}

/**
 * What the agent is told when a docs call is refused: the server's own sentence, which already says
 * what to do, or "try again" when the server gave no clear answer.
 */
export function explainDocsError(error: Error): string {
	if (!isNextpressError(error) || isUnclear(error.status)) return TRY_AGAIN;
	return asSentence(error.message);
}

/**
 * Runs one docs tool. A failure is logged with the tool's name and the ids it acted on, so the log
 * says which page or docs failed, and the agent gets a plain sentence instead of the raw error.
 */
export async function runDocsTool({
	toolName,
	ids,
	run,
}: {
	toolName: string;
	/** The ids the call acts on (homeId, pageId, parentId), so the log names what failed. */
	ids: Record<string, string | undefined>;
	run: () => Promise<McpTextResult>;
}): Promise<McpTextResult> {
	try {
		return await run();
	} catch (caught) {
		const error = caught instanceof Error ? caught : new Error(String(caught));
		logError({
			atFunction: toolName,
			message: `The docs tool ${toolName} did not finish`,
			data: { toolName, ...ids },
			error,
		});
		return docsFailure(explainDocsError(error));
	}
}

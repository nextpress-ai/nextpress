import { safeTry } from "slang-ts";
import type { HttpClient } from "./http-client.types.js";
import { isNextpressError, NextpressError } from "./nextpress-error.js";
import { sdkErr, sdkOk, VERSION_STALE, type SdkResult } from "./sdk-result.js";

type VersionStaleBody = {
	remoteVersion?: number;
	expectedVersion?: number;
};

const warnVersionStale = (error: NextpressError): void => {
	if (error.code !== VERSION_STALE) return;
	const body = error.body as VersionStaleBody | undefined;
	const remote = body?.remoteVersion;
	const expected = body?.expectedVersion;
	if (typeof remote === "number" && typeof expected === "number") {
		console.warn(
			`[nextpress] Update skipped: remote version ${remote} is same or newer than expected ${expected}. Fetch latest and retry.`,
		);
		return;
	}
	console.warn(
		"[nextpress] Update skipped: remote version is same or newer than expected. Fetch latest and retry.",
	);
};

/**
 * Runs an HTTP mutation without throwing — returns SdkResult for agent-safe workflows.
 * Emits a console warning when the server returns VERSION_STALE.
 */
export const safeRequest = async <T>(request: () => Promise<T>): Promise<SdkResult<T>> => {
	const outcome = await safeTry(request);
	if (outcome.isOk) {
		return sdkOk(outcome.value);
	}

	const message = outcome.error;
	const wrapped = new NextpressError({
		message,
		status: 0,
		code: undefined,
		body: message,
	});

	return sdkErr(wrapped);
};

/** Like safeRequest but preserves NextpressError status/code/body from HttpClient. */
export const safeHttpRequest = async <T>(
	http: HttpClient,
	path: string,
	options: Parameters<HttpClient["request"]>[1] = {},
): Promise<SdkResult<T>> => {
	try {
		const value = await http.request<T>(path, options);
		return sdkOk(value);
	} catch (error) {
		if (isNextpressError(error)) {
			warnVersionStale(error);
			return sdkErr(error);
		}
		return sdkErr(
			new NextpressError({
				message: error instanceof Error ? error.message : String(error),
				status: 0,
			}),
		);
	}
};

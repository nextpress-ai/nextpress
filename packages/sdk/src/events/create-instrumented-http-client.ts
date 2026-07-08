import type { HttpClient } from "../client/http-client.types.js";
import type { RequestOptions } from "../types/client.js";
import { pickMutatedEntityResult, syncPayloadWithResult } from "./event-context.js";
import type { NextpressEventMap } from "./nextpress-events.js";
import { isMutationMethod, resolveRequestEvents } from "./resolve-request-events.js";

type EmitFn = <K extends keyof NextpressEventMap & string>(
	event: K,
	payload: NextpressEventMap[K],
) => NextpressEventMap[K];

/**
 * Wraps the HTTP client so successful mutations emit typed SDK events.
 * Keeps event wiring in one place instead of duplicating emits per resource.
 */
export function createInstrumentedHttpClient({
	client,
	emit,
}: {
	client: HttpClient;
	emit: EmitFn;
}): HttpClient {
	const request = async <TResponse>(
		path: string,
		options: RequestOptions = {},
	): Promise<TResponse> => {
		let result = await client.request<TResponse>(path, options);
		const method = options.method ?? "GET";

		if (isMutationMethod(method) && !options.raw) {
			const events = resolveRequestEvents({
				method,
				path,
				body: options.body,
				result,
			});
			for (const { event, payload } of events) {
				const syncedPayload = syncPayloadWithResult(payload, result);
				const finalPayload = emit(event, syncedPayload);
				result = pickMutatedEntityResult(result, finalPayload) as TResponse;
			}
		}

		return result;
	};

	return { request, config: client.config };
}

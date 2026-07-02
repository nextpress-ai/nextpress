import type { HttpClientConfig, RequestOptions } from "../types/client.js";
import { buildUrl, withSiteId } from "./build-url.js";
import { NextpressError } from "./nextpress-error.js";

const API_KEY_HEADER = "Authorization";

/**
 * Creates the low-level HTTP client used by all SDK resources.
 * Sends the API key as a Bearer token on every request.
 */
export function createHttpClient(config: HttpClientConfig) {
	const request = async <TResponse>(
		path: string,
		options: RequestOptions = {},
	): Promise<TResponse> => {
		const url = buildUrl({
			baseUrl: config.baseUrl,
			path,
			query: withSiteId({ query: options.query, siteId: config.siteId }),
		});

		const headers: Record<string, string> = {
			...options.headers,
		};

		if (options.auth !== false) {
			headers[API_KEY_HEADER] = `Bearer ${config.apiKey}`;
		}

		const hasJsonBody =
			options.body !== undefined && options.body !== null && !(options.body instanceof FormData);

		if (hasJsonBody) {
			headers["Content-Type"] = "application/json";
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout);

		try {
			const response = await config.fetch(url, {
				method: options.method ?? "GET",
				headers,
				body: hasJsonBody ? JSON.stringify(options.body) : (options.body as FormData | undefined),
				signal: controller.signal,
			});

			if (options.raw) {
				return response as TResponse;
			}

			if (!response.ok) {
				const text = await response.text();
				let message = text || response.statusText;
				let code: string | undefined;
				let body: unknown = text;

				if (text) {
					try {
						const parsed = JSON.parse(text) as {
							message?: string;
							code?: string;
						};
						if (typeof parsed.message === "string" && parsed.message.trim()) {
							message = parsed.message;
						}
						if (typeof parsed.code === "string" && parsed.code.trim()) {
							code = parsed.code;
						}
						body = parsed;
					} catch {
						/* plain text body */
					}
				}

				throw new NextpressError({
					message,
					status: response.status,
					code,
					body,
				});
			}

			if (response.status === 204) {
				return undefined as TResponse;
			}

			const contentType = response.headers.get("content-type") ?? "";
			if (contentType.includes("application/json")) {
				return (await response.json()) as TResponse;
			}

			return (await response.text()) as TResponse;
		} catch (error) {
			if (error instanceof NextpressError) {
				throw error;
			}
			if (error instanceof Error && error.name === "AbortError") {
				throw new NextpressError({
					message: `Request timed out after ${config.timeout}ms`,
					status: 408,
				});
			}
			throw new NextpressError({
				message: error instanceof Error ? error.message : "Request failed",
				status: 0,
			});
		} finally {
			clearTimeout(timeoutId);
		}
	};

	return {
		request,
		config,
	};
}

export type HttpClient = ReturnType<typeof createHttpClient>;

import type { HttpClientConfig, RequestOptions } from "../types/client.js";

/** Low-level HTTP transport shared by every SDK resource. */
export type HttpClient = {
	/** Single entry point so resources share auth, timeout, and error normalization. */
	request: <TResponse>(path: string, options?: RequestOptions) => Promise<TResponse>;
	config: HttpClientConfig;
};

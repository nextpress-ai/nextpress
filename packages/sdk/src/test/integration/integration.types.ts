/** Shape for `integration.config.ts` — copy from `integration.config.example.ts`. */
export type IntegrationTestConfigInput = {
	/** Set true when the dev server is up and apiKey is filled in. */
	enabled: boolean;
	/** NextPress instance URL. */
	baseUrl: string;
	/** Dashboard API key (`npk_live_…`). Settings → System → API Keys. */
	apiKey: string;
	/** Site UUID the API key is bound to. Must match the site chosen when the key was created. */
	siteId: string;
	/** HTTP timeout per SDK request (ms). */
	requestTimeoutMs?: number;
	/** How long to wait for GET /api/health before failing (ms). */
	serverReadyTimeoutMs?: number;
};

/** Validated config passed to the SDK client. */
export type IntegrationTestConfig = {
	baseUrl: string;
	apiKey: string;
	siteId: string;
	requestTimeoutMs: number;
	serverReadyTimeoutMs: number;
};

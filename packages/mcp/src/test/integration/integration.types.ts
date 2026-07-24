/** Shape for `integration.config.ts` — copy from `integration.config.example.ts`. */
export type IntegrationTestConfigInput = {
	enabled: boolean;
	baseUrl: string;
	apiKey: string;
	siteId: string;
	requestTimeoutMs?: number;
	serverReadyTimeoutMs?: number;
};

/** Validated config for live MCP integration. */
export type IntegrationTestConfig = {
	baseUrl: string;
	apiKey: string;
	siteId: string;
	requestTimeoutMs: number;
	serverReadyTimeoutMs: number;
};

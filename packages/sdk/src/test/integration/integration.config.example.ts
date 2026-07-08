import type { IntegrationTestConfigInput } from "./integration.types.js";

/**
 * Copy this file to `integration.config.ts` and fill in your real values.
 *
 *   cp src/test/integration/integration.config.example.ts src/test/integration/integration.config.ts
 *
 * `integration.config.ts` is gitignored. Never commit your API key.
 */
export const integrationConfig = {
	enabled: false,
	baseUrl: "http://localhost:5000",
	apiKey: "npk_live_paste_your_key_here",
	siteId: "paste-site-uuid-from-dashboard",
	requestTimeoutMs: 30_000,
	serverReadyTimeoutMs: 60_000,
} satisfies IntegrationTestConfigInput;

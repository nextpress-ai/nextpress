import type { IntegrationTestConfig, IntegrationTestConfigInput } from "./integration.types.js";

const API_KEY_PREFIX = "npk_live_";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_READY_MS = 60_000;

const validateConfig = (raw: IntegrationTestConfigInput): IntegrationTestConfig => {
	if (!raw.apiKey.startsWith(API_KEY_PREFIX)) {
		throw new Error(
			`integration.config: apiKey must start with ${API_KEY_PREFIX}. Create one in Settings → System → API Keys.`,
		);
	}
	if (!raw.baseUrl.trim()) {
		throw new Error("integration.config: baseUrl is required.");
	}
	const siteId = raw.siteId?.trim();
	if (!siteId) {
		throw new Error(
			"integration.config: siteId is required. Use the same site UUID you chose when creating the API key.",
		);
	}

	const baseUrlOverride = process.env.NEXTPRESS_URL?.trim() || process.env.INTEGRATION_BASE_URL?.trim();

	return {
		baseUrl: (baseUrlOverride || raw.baseUrl).replace(/\/+$/, ""),
		apiKey: raw.apiKey.trim(),
		siteId,
		requestTimeoutMs: raw.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS,
		serverReadyTimeoutMs: raw.serverReadyTimeoutMs ?? DEFAULT_READY_MS,
	};
};

const tryLoad = async (specifier: string): Promise<IntegrationTestConfigInput | null> => {
	try {
		const mod = await import(specifier);
		return mod.integrationConfig as IntegrationTestConfigInput;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ERR_MODULE_NOT_FOUND" || code === "ENOENT") {
			return null;
		}
		throw error;
	}
};

/**
 * Loads MCP `integration.config.ts`, falling back to the SDK package config
 * so one dashboard key covers both live suites in the monorepo.
 * Returns null when nothing is enabled.
 *
 * Optional: `NEXTPRESS_URL` / `INTEGRATION_BASE_URL` overrides baseUrl (e.g. docker bridge IP).
 */
export const loadIntegrationTestConfig = async (): Promise<IntegrationTestConfig | null> => {
	const local = await tryLoad("./integration.config.js");
	if (local?.enabled) {
		return validateConfig(local);
	}

	const fromSdk = await tryLoad(
		"../../../../sdk/src/test/integration/integration.config.js",
	);
	if (fromSdk?.enabled) {
		return validateConfig(fromSdk);
	}

	return null;
};

export type { IntegrationTestConfig, IntegrationTestConfigInput } from "./integration.types.js";

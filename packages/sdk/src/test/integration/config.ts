import type { IntegrationTestConfig, IntegrationTestConfigInput } from "./integration.types.js";

const API_KEY_PREFIX = "npk_live_";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_READY_MS = 60_000;

const validateConfig = (raw: IntegrationTestConfigInput): IntegrationTestConfig => {
	if (!raw.apiKey.startsWith(API_KEY_PREFIX)) {
		throw new Error(
			`integration.config.ts: apiKey must start with ${API_KEY_PREFIX}. Create one in Settings → System → API Keys.`,
		);
	}

	if (!raw.baseUrl.trim()) {
		throw new Error("integration.config.ts: baseUrl is required.");
	}

	const siteId = raw.siteId?.trim();
	if (!siteId) {
		throw new Error(
			"integration.config.ts: siteId is required. Use the same site UUID you chose when creating the API key.",
		);
	}

	return {
		baseUrl: raw.baseUrl.replace(/\/+$/, ""),
		apiKey: raw.apiKey.trim(),
		siteId,
		requestTimeoutMs: raw.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS,
		serverReadyTimeoutMs: raw.serverReadyTimeoutMs ?? DEFAULT_READY_MS,
	};
};

/**
 * Loads `integration.config.ts` from disk.
 * Returns null when the file is missing, `enabled: false`, or not configured yet.
 */
export const loadIntegrationTestConfig = async (): Promise<IntegrationTestConfig | null> => {
	try {
		const mod = await import("./integration.config.js");
		const raw = mod.integrationConfig as IntegrationTestConfigInput;

		if (!raw?.enabled) {
			return null;
		}

		return validateConfig(raw);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ERR_MODULE_NOT_FOUND" || code === "ENOENT") {
			return null;
		}
		throw error;
	}
};

export type { IntegrationTestConfig, IntegrationTestConfigInput } from "./integration.types.js";

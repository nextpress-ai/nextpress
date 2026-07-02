import type { HttpClient } from "../client/http-client.js";
import type {
	SystemReleaseResponse,
	SystemUpgradeCheckResponse,
	SystemUpgradeRunResponse,
} from "../types/responses.js";

/** System release info and upgrade flows (What's New / upgrade dialog). */
export function createSystemResource({ http }: { http: HttpClient }) {
	return {
		release: async (): Promise<SystemReleaseResponse> => http.request("/api/system/release"),

		checkUpgrade: async (): Promise<SystemUpgradeCheckResponse> =>
			http.request("/api/system/upgrade/check", { method: "POST" }),

		runUpgrade: async (): Promise<SystemUpgradeRunResponse> =>
			http.request("/api/system/upgrade/run", { method: "POST" }),
	};
}

export type SystemResource = ReturnType<typeof createSystemResource>;

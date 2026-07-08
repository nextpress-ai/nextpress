import type { HttpClient } from "../client/http-client.js";
import type {
	SystemReleaseResponse,
	SystemUpgradeCheckResponse,
	SystemUpgradeRunResponse,
} from "../types/responses.js";

export type SystemResource = {
	/** Surface release notes for in-app What's New without parsing GitHub. */
	release: () => Promise<SystemReleaseResponse>;
	/** Detect pending upgrades before prompting the admin upgrade dialog. */
	checkUpgrade: () => Promise<SystemUpgradeCheckResponse>;
	/** Apply a pending upgrade after the admin confirms the dialog. */
	runUpgrade: () => Promise<SystemUpgradeRunResponse>;
};

/** System release info and upgrade flows (What's New / upgrade dialog). */
export function createSystemResource({ http }: { http: HttpClient }): SystemResource {
	return {
		/** Surface release notes for in-app What's New without parsing GitHub. */
		release: async (): Promise<SystemReleaseResponse> => http.request("/api/system/release"),

		/** Detect pending upgrades before prompting the admin upgrade dialog. */
		checkUpgrade: async (): Promise<SystemUpgradeCheckResponse> =>
			http.request("/api/system/upgrade/check", { method: "POST" }),

		/** Apply a pending upgrade after the admin confirms the dialog. */
		runUpgrade: async (): Promise<SystemUpgradeRunResponse> =>
			http.request("/api/system/upgrade/run", { method: "POST" }),
	};
}

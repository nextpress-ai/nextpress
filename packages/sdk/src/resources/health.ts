import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { setupSchema } from "../schemas/index.js";
import type { HealthResponse, SetupStatus } from "../types/domain.js";
import type { SetupInput } from "../types/inputs.js";
import type { SetupResponse, VerifyDomainResponse } from "../types/responses.js";

export type HealthResource = {
	/** Probe install readiness before wiring automation or health checks. */
	check: () => Promise<HealthResponse>;
	/** Gate first-run flows so setup is not attempted twice. */
	setupStatus: () => Promise<SetupStatus>;
	/** Confirm domain DNS before committing to a custom domain in setup. */
	verifyDomain: (params: { q: string }) => Promise<VerifyDomainResponse>;
	/** Bootstrap a fresh install with admin account and site config. */
	setup: (input: SetupInput) => Promise<SetupResponse>;
};

/** Health and first-time setup endpoints. */
export function createHealthResource({ http }: { http: HttpClient }): HealthResource {
	return {
		/** Probe install readiness before wiring automation or health checks. */
		check: async (): Promise<HealthResponse> => http.request("/api/health"),

		/** Gate first-run flows so setup is not attempted twice. */
		setupStatus: async (): Promise<SetupStatus> => http.request("/api/setup/status"),

		/** Confirm domain DNS before committing to a custom domain in setup. */
		verifyDomain: async ({ q }: { q: string }): Promise<VerifyDomainResponse> => {
			if (!q.trim()) {
				throw new Error("Invalid health.verifyDomain q: domain query is required");
			}
			return http.request("/api/setup/verify-domain", { query: { q } });
		},

		/** Bootstrap a fresh install with admin account and site config. */
		setup: async (input: SetupInput): Promise<SetupResponse> => {
			const body = parseInput({
				schema: setupSchema,
				input,
				label: "health.setup input",
			});
			return http.request("/api/setup", { method: "POST", body });
		},
	};
}

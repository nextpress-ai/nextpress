import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { setupSchema } from "../schemas/index.js";
import type { HealthResponse, SetupStatus } from "../types/domain.js";
import type { SetupInput } from "../types/inputs.js";
import type { SetupResponse, VerifyDomainResponse } from "../types/responses.js";

/** Health and first-time setup endpoints. */
export function createHealthResource({ http }: { http: HttpClient }) {
	return {
		check: async (): Promise<HealthResponse> => http.request("/api/health"),

		setupStatus: async (): Promise<SetupStatus> => http.request("/api/setup/status"),

		verifyDomain: async ({ q }: { q: string }): Promise<VerifyDomainResponse> => {
			if (!q.trim()) {
				throw new Error("Invalid health.verifyDomain q: domain query is required");
			}
			return http.request("/api/setup/verify-domain", { query: { q } });
		},

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

export type HealthResource = ReturnType<typeof createHealthResource>;

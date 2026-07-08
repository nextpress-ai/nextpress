import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { partialSettingsSchema } from "../schemas/index.js";
import type { ApiEnvelope, Settings } from "../types/domain.js";
import type { PartialSettingsInput } from "../types/inputs.js";

export type SettingsResource = {
	/** Read site-wide config before rendering settings screens. */
	get: () => Promise<ApiEnvelope<Settings>>;
	/** Patch only changed settings groups without a full replace. */
	update: (input: PartialSettingsInput) => Promise<ApiEnvelope<Settings>>;
};

/** Site-wide settings (General, Writing, Reading, Discussion, System). */
export function createSettingsResource({ http }: { http: HttpClient }): SettingsResource {
	return {
		/** Read site-wide config before rendering settings screens. */
		get: async (): Promise<ApiEnvelope<Settings>> => http.request("/api/settings"),

		/** Patch only changed settings groups without a full replace. */
		update: async (input: PartialSettingsInput): Promise<ApiEnvelope<Settings>> => {
			const body = parseInput({
				schema: partialSettingsSchema,
				input,
				label: "settings.update input",
			});
			return http.request("/api/settings", { method: "PATCH", body });
		},
	};
}

import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { partialSettingsSchema } from "../schemas/index.js";
import type { ApiEnvelope, Settings } from "../types/domain.js";
import type { PartialSettingsInput } from "../types/inputs.js";

/** Site-wide settings (General, Writing, Reading, Discussion, System). */
export function createSettingsResource({ http }: { http: HttpClient }) {
	return {
		get: async (): Promise<ApiEnvelope<Settings>> => http.request("/api/settings"),

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

export type SettingsResource = ReturnType<typeof createSettingsResource>;

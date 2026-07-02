import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { setOptionSchema } from "../schemas/index.js";
import type { Option } from "../types/domain.js";
import type { SetOptionInput } from "../types/inputs.js";

/** WordPress-style site options (e.g. homepage slug). */
export function createOptionsResource({ http }: { http: HttpClient }) {
	return {
		get: async ({ name }: { name: string }): Promise<Option> => {
			if (!name.trim()) throw new Error("Invalid options.get name: name is required");
			return http.request(`/api/options/${encodeURIComponent(name)}`);
		},

		set: async (input: SetOptionInput): Promise<Option> => {
			const body = parseInput({
				schema: setOptionSchema,
				input,
				label: "options.set input",
			});
			return http.request("/api/options", { method: "POST", body });
		},
	};
}

export type OptionsResource = ReturnType<typeof createOptionsResource>;

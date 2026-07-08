import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { setOptionSchema } from "../schemas/index.js";
import type { Option } from "../types/domain.js";
import type { SetOptionInput } from "../types/inputs.js";

export type OptionsResource = {
	/** Read a WordPress-style option by name for routing or feature flags. */
	get: (params: { name: string }) => Promise<Option>;
	/** Upsert an option when no dedicated settings endpoint exists. */
	set: (input: SetOptionInput) => Promise<Option>;
};

/** WordPress-style site options (e.g. homepage slug). */
export function createOptionsResource({ http }: { http: HttpClient }): OptionsResource {
	return {
		/** Read a WordPress-style option by name for routing or feature flags. */
		get: async ({ name }: { name: string }): Promise<Option> => {
			if (!name.trim()) throw new Error("Invalid options.get name: name is required");
			return http.request(`/api/options/${encodeURIComponent(name)}`);
		},

		/** Upsert an option when no dedicated settings endpoint exists. */
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

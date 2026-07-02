import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { idParamSchema } from "../schemas/index.js";
import type { Theme } from "../types/domain.js";

/** Theme management — list, read active theme, activate (matches dashboard theme picker). */
export function createThemesResource({ http }: { http: HttpClient }) {
	return {
		/** List installed themes. Server returns a raw array. */
		list: async (): Promise<Theme[]> => http.request("/api/themes"),

		/** Get the active theme for the install (public endpoint). */
		getActive: async (): Promise<Theme | null> => http.request("/api/themes/active"),

		/** Activate a theme and link it to the scoped site. */
		activate: async ({ id }: { id: string }): Promise<Theme & { siteId: string }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "themes.activate id" });
			return http.request(`/api/themes/${id}/activate`, { method: "POST" });
		},
	};
}

export type ThemesResource = ReturnType<typeof createThemesResource>;

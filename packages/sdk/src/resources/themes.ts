import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { idParamSchema } from "../schemas/index.js";
import type { Theme } from "../types/domain.js";

export type ThemesResource = {
	/** Enumerate installed themes for the dashboard theme picker. */
	list: () => Promise<Theme[]>;
	/** Read the active theme for public rendering without admin auth. */
	getActive: () => Promise<Theme | null>;
	/** Switch the scoped site's theme in one call. */
	activate: (params: { id: string }) => Promise<Theme & { siteId: string }>;
};

/** Theme management — list, read active theme, activate (matches dashboard theme picker). */
export function createThemesResource({ http }: { http: HttpClient }): ThemesResource {
	return {
		/** Enumerate installed themes for the dashboard theme picker. */
		list: async (): Promise<Theme[]> => http.request("/api/themes"),

		/** Read the active theme for public rendering without admin auth. */
		getActive: async (): Promise<Theme | null> => http.request("/api/themes/active"),

		/** Switch the scoped site's theme in one call. */
		activate: async ({ id }: { id: string }): Promise<Theme & { siteId: string }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "themes.activate id" });
			return http.request(`/api/themes/${id}/activate`, { method: "POST" });
		},
	};
}

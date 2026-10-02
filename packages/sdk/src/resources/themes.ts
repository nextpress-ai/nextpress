import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { idParamSchema } from "../schemas/index.js";
import type { Theme, ThemeDesign } from "../types/domain.js";

export type ThemeWrite = {
	name?: string;
	description?: string | null;
	settings?: ThemeDesign;
};

export type ThemesResource = {
	/** Enumerate installed themes for the dashboard theme picker. */
	list: () => Promise<Theme[]>;
	/** Read one theme, including its colors and type. */
	get: (params: { id: string }) => Promise<Theme>;
	/** Read the active theme for public rendering without admin auth. */
	getActive: () => Promise<Theme | null>;
	/** Add a theme. It stays off until activate. */
	create: (input: { name: string; description?: string; settings?: ThemeDesign }) => Promise<Theme>;
	/** Change a theme's name or design. The built-in Default theme cannot be edited. */
	update: (params: { id: string } & ThemeWrite) => Promise<Theme>;
	/** Switch the scoped site's theme in one call. */
	activate: (params: { id: string }) => Promise<Theme & { siteId: string }>;
};

/** Theme management — list, read active theme, activate (matches dashboard theme picker). */
export function createThemesResource({ http }: { http: HttpClient }): ThemesResource {
	return {
		/** Enumerate installed themes for the dashboard theme picker. */
		list: async (): Promise<Theme[]> => http.request("/api/themes"),

		/** Read one theme, including its colors and type. */
		get: async ({ id }: { id: string }): Promise<Theme> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "themes.get id" });
			return http.request(`/api/themes/${id}`);
		},

		/** Read the active theme for public rendering without admin auth. */
		getActive: async (): Promise<Theme | null> => http.request("/api/themes/active"),

		/** Add a theme. It stays off until activate. */
		create: async (input: { name: string; description?: string; settings?: ThemeDesign }): Promise<Theme> =>
			http.request("/api/themes", { method: "POST", body: input }),

		/** Change a theme's name or design. The built-in Default theme cannot be edited. */
		update: async ({ id, ...body }: { id: string } & ThemeWrite): Promise<Theme> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "themes.update id" });
			return http.request(`/api/themes/${id}`, { method: "PATCH", body });
		},

		/** Switch the scoped site's theme in one call. */
		activate: async ({ id }: { id: string }): Promise<Theme & { siteId: string }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "themes.activate id" });
			return http.request(`/api/themes/${id}/activate`, { method: "POST" });
		},
	};
}

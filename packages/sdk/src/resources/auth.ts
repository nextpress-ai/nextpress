import type { HttpClient } from "../client/http-client.js";
import type { AuthUser } from "../types/domain.js";

/** Resolves the authenticated CMS user when using an API key or session-backed fetch. */
export function createAuthResource({ http }: { http: HttpClient }) {
	return {
		/** Current authenticated CMS user (`GET /api/auth/user`). */
		me: async (): Promise<AuthUser> => http.request("/api/auth/user"),
	};
}

export type AuthResource = ReturnType<typeof createAuthResource>;

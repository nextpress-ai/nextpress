import type { HttpClient } from "../client/http-client.js";
import type { AuthUser } from "../types/domain.js";

export type AuthResource = {
	/** Current authenticated CMS user (`GET /api/auth/user`). */
	me: () => Promise<AuthUser>;
};

/** Resolves the authenticated CMS user when using an API key or session-backed fetch. */
export function createAuthResource({ http }: { http: HttpClient }): AuthResource {
	return {
		/** Current authenticated CMS user (`GET /api/auth/user`). */
		me: async (): Promise<AuthUser> => http.request("/api/auth/user"),
	};
}

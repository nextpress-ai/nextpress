import type { HttpClient } from "../client/http-client.js";
import type { DashboardStats } from "../types/domain.js";

/** Creates the dashboard resource for aggregate site statistics. */
export function createDashboardResource({ http }: { http: HttpClient }) {
	return {
		/** Get post, page, comment, and user counts for the scoped site. */
		stats: async (): Promise<DashboardStats> => {
			return http.request("/api/dashboard/stats");
		},
	};
}

export type DashboardResource = ReturnType<typeof createDashboardResource>;

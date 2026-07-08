import type { HttpClient } from "../client/http-client.js";
import type { DashboardStats } from "../types/domain.js";

export type DashboardResource = {
	/** Aggregate content counts for dashboard overview widgets. */
	stats: () => Promise<DashboardStats>;
};

/** Creates the dashboard resource for aggregate site statistics. */
export function createDashboardResource({ http }: { http: HttpClient }): DashboardResource {
	return {
		/** Aggregate content counts for dashboard overview widgets. */
		stats: async (): Promise<DashboardStats> => {
			return http.request("/api/dashboard/stats");
		},
	};
}

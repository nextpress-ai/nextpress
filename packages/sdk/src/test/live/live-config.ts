/** Live test configuration from environment (never reads .env directly). */
export type LiveTestConfig = {
	baseUrl: string;
	email: string;
	password: string;
	setupSiteName: string;
	setupDomain: string;
	setupUsername: string;
	requestTimeoutMs: number;
	serverReadyTimeoutMs: number;
};

/** Resolves live integration test settings with sensible local defaults. */
export function resolveLiveTestConfig(): LiveTestConfig {
	return {
		baseUrl: process.env.NEXPRESS_TEST_BASE_URL ?? "http://localhost:5000",
		email: process.env.NEXPRESS_TEST_EMAIL ?? "hssnkizz@gmail.com",
		password: process.env.NEXPRESS_TEST_PASSWORD ?? "Abcd1234!",
		setupSiteName: process.env.NEXPRESS_TEST_SITE_NAME ?? "NextPress SDK Live",
		setupDomain: process.env.NEXPRESS_TEST_DOMAIN ?? "localhost",
		setupUsername: process.env.NEXPRESS_TEST_USERNAME ?? "admin",
		requestTimeoutMs: Number(process.env.NEXPRESS_TEST_TIMEOUT_MS ?? 15_000),
		serverReadyTimeoutMs: Number(process.env.NEXPRESS_TEST_READY_MS ?? 60_000),
	};
}

/** Returns true when live tests should run (server must be up). */
export function isLiveTestEnabled(): boolean {
	return process.env.LIVE_TEST === "1" || process.env.LIVE_TEST === "true";
}

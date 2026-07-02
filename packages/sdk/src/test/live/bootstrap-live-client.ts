import type { NextpressClient } from "../../create-nextpress.js";
import { createNextpress } from "../../create-nextpress.js";
import { resolveLiveTestConfig } from "./live-config.js";
import { createSessionFetch } from "./session-fetch.js";

type LiveClientContext = {
	client: NextpressClient;
	config: ReturnType<typeof resolveLiveTestConfig>;
	siteId?: string;
};

/** Waits until the dev server responds to /api/health. */
export async function waitForServerReady({
	baseUrl,
	timeoutMs,
}: {
	baseUrl: string;
	timeoutMs: number;
}): Promise<void> {
	const started = Date.now();
	let lastError = "Server not ready";

	while (Date.now() - started < timeoutMs) {
		try {
			const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/health`);
			if (response.ok) {
				return;
			}
			lastError = `Health returned ${response.status}`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : "Health check failed";
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Live server not ready at ${baseUrl}: ${lastError}`);
}

/** Runs setup when the instance has no sites yet. */
export async function ensureSetup({
	baseUrl,
	email,
	password,
	username,
	siteName,
	domain,
	fetchImpl,
}: {
	baseUrl: string;
	email: string;
	password: string;
	username: string;
	siteName: string;
	domain: string;
	fetchImpl: typeof fetch;
}): Promise<void> {
	const statusResponse = await fetchImpl(`${baseUrl}/api/setup/status`);
	const status = (await statusResponse.json()) as { isSetup: boolean };
	if (status.isSetup) {
		return;
	}

	const setupResponse = await fetchImpl(`${baseUrl}/api/setup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, username, siteName, domain }),
	});

	if (!setupResponse.ok) {
		const text = await setupResponse.text();
		throw new Error(`Setup failed (${setupResponse.status}): ${text}`);
	}
}

/** Signs in via Better Auth email flow and returns a cookie-aware SDK client. */
export async function createLiveClient(): Promise<LiveClientContext> {
	const config = resolveLiveTestConfig();
	const sessionFetch = createSessionFetch({ origin: config.baseUrl });

	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	await ensureSetup({
		baseUrl: config.baseUrl,
		email: config.email,
		password: config.password,
		username: config.setupUsername,
		siteName: config.setupSiteName,
		domain: config.setupDomain,
		fetchImpl: sessionFetch,
	});

	const signInResponse = await sessionFetch(`${config.baseUrl}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: config.email,
			password: config.password,
		}),
	});

	if (!signInResponse.ok) {
		const text = await signInResponse.text();
		throw new Error(`Sign-in failed (${signInResponse.status}): ${text}`);
	}

	const client = createNextpress({
		baseUrl: config.baseUrl,
		apiKey: "live-test-session",
		fetch: sessionFetch,
		timeout: config.requestTimeoutMs,
	});

	await client.auth.me();
	const sites = await client.sites.list();
	const defaultSite = sites.sites.find((site) => site.isDefault) ?? sites.sites[0];

	return {
		client: createNextpress({
			baseUrl: config.baseUrl,
			apiKey: "live-test-session",
			siteId: defaultSite?.id,
			fetch: sessionFetch,
			timeout: config.requestTimeoutMs,
		}),
		config,
		siteId: defaultSite?.id,
	};
}

export type { LiveClientContext };

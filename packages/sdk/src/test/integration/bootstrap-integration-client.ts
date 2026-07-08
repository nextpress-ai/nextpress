import type { NextpressClient } from "@nextpress-org/sdk";
import type { IntegrationTestConfig } from "./integration.types.js";
import { loadShippedSdk, type ShippedSdkModule } from "./load-shipped-sdk.js";
import { waitForServerReady } from "./wait-for-server.js";

export type { ShippedSdkModule };

export type IntegrationClientContext = {
	client: NextpressClient;
	config: IntegrationTestConfig;
	sdk: ShippedSdkModule;
	sdkModulePath: string;
};

/** Loads the built SDK and creates a client authenticated with a real API key. */
export const createIntegrationClient = async ({
	config,
}: {
	config: IntegrationTestConfig;
}): Promise<IntegrationClientContext> => {
	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const { sdk, modulePath } = await loadShippedSdk();
	const client = sdk.createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	await client.auth.me();

	return { client, config, sdk, sdkModulePath: modulePath };
};

/** Waits until the NextPress instance responds to GET /api/health. */
export const waitForServerReady = async ({
	baseUrl,
	timeoutMs,
}: {
	baseUrl: string;
	timeoutMs: number;
}): Promise<void> => {
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

	throw new Error(`NextPress not ready at ${baseUrl}: ${lastError}`);
};

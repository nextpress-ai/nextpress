export type McpRuntimeConfig = {
	baseUrl: string;
	apiKey: string;
	siteId: string;
};

type ParseConfigParams = {
	argv: string[];
	env: NodeJS.ProcessEnv;
};

/**
 * Resolve MCP connection settings from CLI flags and environment.
 * Flags win over env so local overrides stay explicit.
 */
export function parseMcpConfig({ argv, env }: ParseConfigParams): McpRuntimeConfig {
	const flags = parseFlags(argv);

	const baseUrl = flags.url ?? env.NEXTPRESS_URL ?? "";
	const apiKey = flags.apiKey ?? env.NEXTPRESS_API_KEY ?? "";
	const siteId = flags.siteId ?? env.NEXTPRESS_SITE_ID ?? "";

	if (!baseUrl.trim()) {
		throw new Error(
			"Missing NextPress URL. Set NEXTPRESS_URL or pass --url https://your-site.example",
		);
	}
	if (!apiKey.trim()) {
		throw new Error(
			"Missing API key. Set NEXTPRESS_API_KEY or pass --api-key npk_live_… (mint in Settings → System → API Keys)",
		);
	}
	if (!siteId.trim()) {
		throw new Error(
			"Missing site UUID. Set NEXTPRESS_SITE_ID or pass --site-id <uuid> (same site as the API key)",
		);
	}

	return {
		baseUrl: baseUrl.replace(/\/+$/, ""),
		apiKey: apiKey.trim(),
		siteId: siteId.trim(),
	};
}

type ParsedFlags = {
	url?: string;
	apiKey?: string;
	siteId?: string;
};

function parseFlags(argv: string[]): ParsedFlags {
	const out: ParsedFlags = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];
		if (arg === "--url" && next) {
			out.url = next;
			i++;
			continue;
		}
		if (arg === "--api-key" && next) {
			out.apiKey = next;
			i++;
			continue;
		}
		if (arg === "--site-id" && next) {
			out.siteId = next;
			i++;
			continue;
		}
		if (arg.startsWith("--url=")) {
			out.url = arg.slice("--url=".length);
			continue;
		}
		if (arg.startsWith("--api-key=")) {
			out.apiKey = arg.slice("--api-key=".length);
			continue;
		}
		if (arg.startsWith("--site-id=")) {
			out.siteId = arg.slice("--site-id=".length);
		}
	}
	return out;
}

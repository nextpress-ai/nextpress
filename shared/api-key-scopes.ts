/** Canonical API key permission scopes for SDK and MCP integrations. */
export const API_KEY_SCOPE_IDS = [
	"content:read",
	"content:write",
	"preview:write",
	"settings:read",
	"settings:write",
	"users:read",
	"users:write",
	"sites:read",
	"sites:write",
	"system:read",
	"system:write",
] as const;

export type ApiKeyScopeId = (typeof API_KEY_SCOPE_IDS)[number];

export type ApiKeyScopeMeta = {
	id: ApiKeyScopeId;
	label: string;
	description: string;
	group: "content" | "site" | "admin" | "system";
};

/** User-facing group labels for the dashboard permission picker. */
export const API_KEY_SCOPE_GROUP_LABELS: Record<ApiKeyScopeMeta["group"], string> = {
	content: "Content",
	site: "Site",
	admin: "Administration",
	system: "System",
};

/** User-facing scope catalog for the dashboard key creation form. */
export const API_KEY_SCOPE_CATALOG: ApiKeyScopeMeta[] = [
	{
		id: "content:read",
		label: "Read content",
		description:
			"View pages, posts, blogs, templates, comments, media, themes, plugins, and dashboard stats",
		group: "content",
	},
	{
		id: "content:write",
		label: "Edit content",
		description:
			"Create, update, and delete pages, posts, blogs, templates, comments, media, themes, and plugins",
		group: "content",
	},
	{
		id: "preview:write",
		label: "Preview links",
		description:
			"Create time-limited preview share links. Viewing previews also needs Read content.",
		group: "content",
	},
	{
		id: "settings:read",
		label: "Read settings",
		description: "View site settings, options, and site details",
		group: "site",
	},
	{
		id: "settings:write",
		label: "Edit settings",
		description: "Change site settings, options, and site details",
		group: "site",
	},
	{
		id: "users:read",
		label: "Read users",
		description: "View user accounts",
		group: "admin",
	},
	{
		id: "users:write",
		label: "Manage users",
		description: "Create, update, and delete user accounts",
		group: "admin",
	},
	{
		id: "sites:read",
		label: "Read sites",
		description: "View sites in multi-site installs",
		group: "admin",
	},
	{
		id: "sites:write",
		label: "Manage sites",
		description: "Create, update, and delete sites",
		group: "admin",
	},
	{
		id: "system:read",
		label: "Read system info",
		description: "View release and upgrade information",
		group: "system",
	},
	{
		id: "system:write",
		label: "System actions",
		description: "Run imports, upgrades, and other system tools",
		group: "system",
	},
];

export type ApiKeyScopePreset = {
	id: string;
	label: string;
	description: string;
	scopes: ApiKeyScopeId[];
};

export const API_KEY_SCOPE_PRESETS: ApiKeyScopePreset[] = [
	{
		id: "editor",
		label: "Content editor",
		description: "Read and edit content, plus preview links",
		scopes: ["content:read", "content:write", "preview:write"],
	},
	{
		id: "readonly",
		label: "Read only",
		description: "View content and settings without making changes",
		scopes: ["content:read", "settings:read"],
	},
	{
		id: "full",
		label: "Full access",
		description: "All permissions except revoking keys (dashboard only)",
		scopes: [...API_KEY_SCOPE_IDS],
	},
];

const VALID_SCOPE_SET = new Set<string>(API_KEY_SCOPE_IDS);

/** Filters unknown values and deduplicates scope IDs. */
export const normalizeApiKeyScopes = (input: unknown): ApiKeyScopeId[] => {
	if (!Array.isArray(input)) {
		return [];
	}

	const next = new Set<ApiKeyScopeId>();
	for (const value of input) {
		if (typeof value === "string" && VALID_SCOPE_SET.has(value)) {
			next.add(value as ApiKeyScopeId);
		}
	}
	return [...next];
};

/** Write scopes imply matching read scopes (content:write includes content:read). */
export const expandApiKeyScopes = (scopes: readonly string[]): Set<string> => {
	const expanded = new Set<string>(scopes);
	for (const scope of scopes) {
		if (scope.endsWith(":write")) {
			expanded.add(scope.replace(/:write$/, ":read"));
		}
	}
	return expanded;
};

/** Returns true when granted scopes satisfy every required scope. */
export const apiKeyScopesAllow = ({
	granted,
	required,
}: {
	granted: readonly string[];
	required: readonly string[];
}): boolean => {
	if (required.length === 0) {
		return granted.length > 0;
	}
	const expanded = expandApiKeyScopes(granted);
	return required.every((scope) => expanded.has(scope));
};

type ScopeRule = {
	matches: (params: { method: string; path: string }) => boolean;
	scopes: (params: { method: string; path: string }) => string[] | null;
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const writeOrReadScope = ({
	method,
	read,
	write,
}: {
	method: string;
	read: string;
	write: string;
}): string[] => (WRITE_METHODS.has(method) ? [write] : [read]);

const contentPath = (path: string): boolean =>
	/^\/api\/(pages|posts|blogs|templates|comments|media|themes|plugins|hooks|dashboard)(\/|$)/.test(
		path,
	);

const settingsPath = (path: string): boolean =>
	/^\/api\/(settings|options|site)(\/|$)/.test(path);

const SCOPE_RULES: ScopeRule[] = [
	{
		matches: ({ path }) =>
			path.startsWith("/api/health") ||
			path.startsWith("/api/setup") ||
			path.startsWith("/api/public") ||
			path.startsWith("/api/preview/shared") ||
			path.startsWith("/api/auth/api-keys") ||
			(path.startsWith("/api/auth/") && path !== "/api/auth/user"),
		scopes: () => null,
	},
	{
		matches: ({ method, path }) => method === "GET" && path === "/api/auth/user",
		scopes: () => [],
	},
	{
		matches: ({ method, path }) => method === "POST" && path === "/api/preview/tokens",
		scopes: () => ["preview:write"],
	},
	{
		matches: ({ path }) => path.startsWith("/api/preview/"),
		scopes: () => ["content:read"],
	},
	{
		matches: ({ path }) => contentPath(path),
		scopes: ({ method }) =>
			writeOrReadScope({ method, read: "content:read", write: "content:write" }),
	},
	{
		matches: ({ path }) => settingsPath(path),
		scopes: ({ method }) =>
			writeOrReadScope({ method, read: "settings:read", write: "settings:write" }),
	},
	{
		matches: ({ path }) => path.startsWith("/api/users"),
		scopes: ({ method }) =>
			writeOrReadScope({ method, read: "users:read", write: "users:write" }),
	},
	{
		matches: ({ path }) => path.startsWith("/api/sites"),
		scopes: ({ method }) =>
			writeOrReadScope({ method, read: "sites:read", write: "sites:write" }),
	},
	{
		matches: ({ path }) => path.startsWith("/api/system") || path.startsWith("/api/import"),
		scopes: ({ method }) =>
			writeOrReadScope({ method, read: "system:read", write: "system:write" }),
	},
];

/**
 * Resolves required scopes for an API request.
 * `null` = no API key scope check (public or dashboard-only route).
 * `[]` = any valid key with at least one scope (e.g. auth identity).
 * Unmapped `/api/*` routes require full access (fail closed).
 */
export const resolveRequiredApiKeyScopes = ({
	method,
	path,
}: {
	method: string;
	path: string;
}): string[] | null => {
	const normalizedPath = path.split("?")[0] ?? path;
	const upperMethod = method.toUpperCase();

	for (const rule of SCOPE_RULES) {
		const params = { method: upperMethod, path: normalizedPath };
		if (rule.matches(params)) {
			return rule.scopes(params);
		}
	}

	if (normalizedPath.startsWith("/api/")) {
		return [...API_KEY_SCOPE_IDS];
	}

	return null;
};

export const formatApiKeyScopeLabel = (scopeId: string): string => {
	const match = API_KEY_SCOPE_CATALOG.find((entry) => entry.id === scopeId);
	return match?.label ?? scopeId;
};

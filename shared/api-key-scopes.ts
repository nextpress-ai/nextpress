/** Content resources with separate read and write API key permissions. */
export const CONTENT_RESOURCE_IDS = [
	"pages",
	"posts",
	"blogs",
	"templates",
	"comments",
	"media",
	"themes",
	"plugins",
] as const;

export type ContentResourceId = (typeof CONTENT_RESOURCE_IDS)[number];

/** Legacy broad scopes stored on older keys; expanded at check time. */
export const LEGACY_API_KEY_SCOPE_IDS = ["content:read", "content:write"] as const;

const contentResourceScopes = (): ApiKeyScopeId[] =>
	CONTENT_RESOURCE_IDS.flatMap((resource) => [
		`${resource}:read`,
		`${resource}:write`,
	]) as ApiKeyScopeId[];

/** Canonical API key permission scopes for SDK and MCP integrations. */
export const API_KEY_SCOPE_IDS = [
	...contentResourceScopes(),
	"hooks:read",
	"dashboard:read",
	"preview:write",
	"settings:read",
	"settings:write",
	"users:read",
	"users:write",
	"sites:read",
	"sites:write",
	"system:read",
	"system:write",
	...LEGACY_API_KEY_SCOPE_IDS,
] as const;

export type ApiKeyScopeId = (typeof API_KEY_SCOPE_IDS)[number];

export type ApiKeyScopeMeta = {
	id: ApiKeyScopeId;
	label: string;
	description: string;
	group:
		| ContentResourceId
		| "hooks"
		| "dashboard"
		| "preview"
		| "site"
		| "admin"
		| "system";
};

/** User-facing group labels for the dashboard permission picker. */
export const API_KEY_SCOPE_GROUP_LABELS: Record<ApiKeyScopeMeta["group"], string> = {
	pages: "Pages",
	posts: "Posts",
	blogs: "Blogs",
	templates: "Templates",
	comments: "Comments",
	media: "Media",
	themes: "Themes",
	plugins: "Plugins",
	hooks: "Hooks",
	dashboard: "Dashboard",
	preview: "Preview",
	site: "Site",
	admin: "Administration",
	system: "System",
};

const CONTENT_RESOURCE_COPY: Record<
	ContentResourceId,
	{ singular: string; blurb: string }
> = {
	pages: { singular: "pages", blurb: "site pages and block layouts" },
	posts: { singular: "posts", blurb: "blog posts and their content" },
	blogs: { singular: "blogs", blurb: "blogs and blog settings" },
	templates: { singular: "templates", blurb: "reusable page layouts" },
	comments: { singular: "comments", blurb: "comments and moderation" },
	media: { singular: "media", blurb: "uploads and the media library" },
	themes: { singular: "themes", blurb: "installed themes and activation" },
	plugins: { singular: "plugins", blurb: "installed plugins" },
};

const contentResourceCatalog = (): ApiKeyScopeMeta[] =>
	CONTENT_RESOURCE_IDS.flatMap((resource) => {
		const copy = CONTENT_RESOURCE_COPY[resource];
		return [
			{
				id: `${resource}:read` as ApiKeyScopeId,
				label: `View ${copy.singular}`,
				description: `Read ${copy.blurb}`,
				group: resource,
			},
			{
				id: `${resource}:write` as ApiKeyScopeId,
				label: `Edit ${copy.singular}`,
				description: `Create, update, and delete ${copy.blurb}`,
				group: resource,
			},
		];
	});

/** User-facing scope catalog for the dashboard key creation form. */
export const API_KEY_SCOPE_CATALOG: ApiKeyScopeMeta[] = [
	...contentResourceCatalog(),
	{
		id: "hooks:read",
		label: "View hooks",
		description: "List registered hooks and integrations",
		group: "hooks",
	},
	{
		id: "dashboard:read",
		label: "View dashboard stats",
		description: "Read site summary counts and dashboard metrics",
		group: "dashboard",
	},
	{
		id: "preview:write",
		label: "Preview links",
		description:
			"Create time-limited preview share links. Viewing previews also needs read access for the content type.",
		group: "preview",
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

const allContentReadScopes = (): ApiKeyScopeId[] => [
	...(CONTENT_RESOURCE_IDS.map((resource) => `${resource}:read`) as ApiKeyScopeId[]),
	"hooks:read",
	"dashboard:read",
];

const allContentWriteScopes = (): ApiKeyScopeId[] =>
	CONTENT_RESOURCE_IDS.map((resource) => `${resource}:write`) as ApiKeyScopeId[];

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
		description: "Read and edit all content types, plus preview links",
		scopes: [...allContentReadScopes(), ...allContentWriteScopes(), "preview:write"],
	},
	{
		id: "posts-editor",
		label: "Posts editor",
		description: "Create and edit blog posts, plus preview links",
		scopes: ["posts:read", "posts:write", "preview:write"],
	},
	{
		id: "readonly",
		label: "Read only",
		description: "View content and settings without making changes",
		scopes: [...allContentReadScopes(), "settings:read"],
	},
	{
		id: "full",
		label: "Full access",
		description: "All permissions except revoking keys (dashboard only)",
		scopes: API_KEY_SCOPE_CATALOG.map((entry) => entry.id),
	},
];

const VALID_SCOPE_SET = new Set<string>(API_KEY_SCOPE_IDS);

const LEGACY_SCOPE_LABELS: Record<string, string> = {
	"content:read": "Read all content (legacy)",
	"content:write": "Edit all content (legacy)",
};

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

const expandLegacyContentScopes = (expanded: Set<string>): void => {
	if (expanded.has("content:read")) {
		for (const scope of allContentReadScopes()) {
			expanded.add(scope);
		}
	}
	if (expanded.has("content:write")) {
		for (const scope of allContentWriteScopes()) {
			expanded.add(scope);
		}
	}
};

/** Write scopes imply matching read scopes (`posts:write` includes `posts:read`). */
export const expandApiKeyScopes = (scopes: readonly string[]): Set<string> => {
	const expanded = new Set<string>(scopes);
	for (const scope of scopes) {
		if (scope.endsWith(":write")) {
			expanded.add(scope.replace(/:write$/, ":read"));
		}
	}
	expandLegacyContentScopes(expanded);
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

const settingsPath = (path: string): boolean =>
	/^\/api\/(settings|options|site)(\/|$)/.test(path);

const CONTENT_RESOURCE_RULES: ScopeRule[] = CONTENT_RESOURCE_IDS.map((resource) => ({
	matches: ({ path }) => path.startsWith(`/api/${resource}`),
	scopes: ({ method }) =>
		writeOrReadScope({
			method,
			read: `${resource}:read`,
			write: `${resource}:write`,
		}),
}));

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
		matches: ({ path }) => path.startsWith("/api/preview/post/"),
		scopes: () => ["posts:read"],
	},
	{
		matches: ({ path }) => path.startsWith("/api/preview/page/"),
		scopes: () => ["pages:read"],
	},
	{
		matches: ({ path }) => path.startsWith("/api/preview/template/"),
		scopes: () => ["templates:read"],
	},
	...CONTENT_RESOURCE_RULES,
	{
		matches: ({ path }) => path.startsWith("/api/hooks"),
		scopes: () => ["hooks:read"],
	},
	{
		matches: ({ path }) => path.startsWith("/api/dashboard"),
		scopes: () => ["dashboard:read"],
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
		return [...API_KEY_SCOPE_CATALOG.map((entry) => entry.id)];
	}

	return null;
};

export const formatApiKeyScopeLabel = (scopeId: string): string => {
	const match = API_KEY_SCOPE_CATALOG.find((entry) => entry.id === scopeId);
	if (match) {
		return match.label;
	}
	return LEGACY_SCOPE_LABELS[scopeId] ?? scopeId;
};

/** When enabling a write scope in the dashboard, also select its read pair. */
export const pairedReadScopeId = (scopeId: ApiKeyScopeId): ApiKeyScopeId | null => {
	if (!scopeId.endsWith(":write")) {
		return null;
	}
	const readScope = scopeId.replace(/:write$/, ":read");
	return VALID_SCOPE_SET.has(readScope) ? (readScope as ApiKeyScopeId) : null;
};

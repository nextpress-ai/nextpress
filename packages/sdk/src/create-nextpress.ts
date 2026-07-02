import { createBlocksBuilder } from "./blocks/build-block.js";
import { createHttpClient } from "./client/http-client.js";
import { parseInput } from "./client/validate-input.js";
import { createEditorSession } from "./editor/create-editor-session.js";
import { createPageBuilder } from "./page-builder/create-page-builder.js";
import { createAuthResource } from "./resources/auth.js";
import { createBlogsResource } from "./resources/blogs.js";
import { createCommentsResource } from "./resources/comments.js";
import { createDashboardResource } from "./resources/dashboard.js";
import { createHealthResource } from "./resources/health.js";
import { createHooksResource } from "./resources/hooks.js";
import { createImportResource } from "./resources/import.js";
import { createMediaResource } from "./resources/media.js";
import { createOptionsResource } from "./resources/options.js";
import { createPagesResource } from "./resources/pages.js";
import { createPluginsResource } from "./resources/plugins.js";
import { createPostsResource } from "./resources/posts.js";
import { createPreviewResource } from "./resources/preview.js";
import { createPublicResource } from "./resources/public.js";
import { createSettingsResource } from "./resources/settings.js";
import { createSiteInfoResource } from "./resources/site-info.js";
import { createSitesResource } from "./resources/sites.js";
import { createSystemResource } from "./resources/system.js";
import { createTemplatesResource } from "./resources/templates.js";
import { createThemesResource } from "./resources/themes.js";
import { createUsersResource } from "./resources/users.js";
import { nextpressOptionsSchema } from "./schemas/index.js";
import type { NextpressOptions } from "./types/client.js";

/**
 * Creates a typed NextPress SDK client covering dashboard and page builder workflows.
 */
export function createNextpress(options: NextpressOptions) {
	const parsed = parseInput({
		schema: nextpressOptionsSchema,
		input: options,
		label: "createNextpress options",
	});

	const http = createHttpClient({
		baseUrl: parsed.baseUrl,
		apiKey: parsed.apiKey,
		siteId: parsed.siteId,
		fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
		timeout: parsed.timeout ?? 30_000,
	});

	const blocks = createBlocksBuilder();
	const pages = createPagesResource({ http });
	const posts = createPostsResource({ http });
	const templates = createTemplatesResource({ http });
	const preview = createPreviewResource({ http, baseUrl: parsed.baseUrl });

	const editorDeps = { pages, posts, templates, preview, blocks };

	return {
		http,
		blocks,
		config: {
			baseUrl: parsed.baseUrl,
			siteId: parsed.siteId,
		},
		auth: createAuthResource({ http }),
		posts,
		pages,
		blogs: createBlogsResource({ http }),
		comments: createCommentsResource({ http }),
		media: createMediaResource({ http }),
		users: createUsersResource({ http }),
		sites: createSitesResource({ http }),
		site: createSiteInfoResource({ http }),
		settings: createSettingsResource({ http }),
		options: createOptionsResource({ http }),
		templates,
		themes: createThemesResource({ http }),
		plugins: createPluginsResource({ http }),
		hooks: createHooksResource({ http }),
		dashboard: createDashboardResource({ http }),
		preview,
		public: createPublicResource({ http }),
		import: createImportResource({ http }),
		system: createSystemResource({ http }),
		health: createHealthResource({ http }),
		pageBuilder: createPageBuilder({ pages, posts, templates, preview, blocks }),
		/** Stateful editor with undo/redo, save, publish, and expiring preview links. */
		createEditorSession: (opts?: { coalesceMs?: number }) =>
			createEditorSession({ ...editorDeps, coalesceMs: opts?.coalesceMs }),
	};
}

export type NextpressClient = ReturnType<typeof createNextpress>;

import type { BlocksBuilder } from "./blocks/blocks-builder.types.js";
import type { HttpClient } from "./client/http-client.types.js";
import type { EventBus } from "./events/event-bus.types.js";
import type { NextpressEventMap } from "./events/nextpress-events.js";
import type { EditorSession } from "./editor/editor-session.types.js";
import type {
	AuthResource,
	BlogsResource,
	CommentsResource,
	DashboardResource,
	HealthResource,
	HooksResource,
	ImportResource,
	MediaResource,
	OptionsResource,
	PagesResource,
	PluginsResource,
	PostsResource,
	PreviewResource,
	PublicResource,
	SettingsResource,
	SiteInfoResource,
	SitesResource,
	SystemResource,
	TemplatesResource,
	ThemesResource,
	UsersResource,
} from "./resources/index.js";
import type { EditorSessionOptions } from "./types/common-params.js";

/** Typed NextPress SDK client covering dashboard and page builder workflows. */
export type NextpressClient = {
	on: EventBus<NextpressEventMap>["on"];
	off: EventBus<NextpressEventMap>["off"];
	once: EventBus<NextpressEventMap>["once"];
	http: HttpClient;
	blocks: BlocksBuilder;
	config: {
		baseUrl: string;
		siteId: string;
	};
	auth: AuthResource;
	posts: PostsResource;
	pages: PagesResource;
	blogs: BlogsResource;
	comments: CommentsResource;
	media: MediaResource;
	users: UsersResource;
	sites: SitesResource;
	site: SiteInfoResource;
	settings: SettingsResource;
	options: OptionsResource;
	templates: TemplatesResource;
	themes: ThemesResource;
	plugins: PluginsResource;
	hooks: HooksResource;
	dashboard: DashboardResource;
	preview: PreviewResource;
	public: PublicResource;
	import: ImportResource;
	system: SystemResource;
	health: HealthResource;
	/** Stateful editor with undo/redo, save, publish, and expiring preview links. */
	createEditorSession: (opts?: EditorSessionOptions) => EditorSession;
};

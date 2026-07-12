import type { IconSetId, PageOther as PageOtherSettings } from "./page-other.js";

/**
 * Content status values accepted by the NextPress API.
 * Use `"any"` on list endpoints to disable status filtering.
 */
export type ContentStatus = "publish" | "draft" | "preview" | "private" | "any";

/** Lucide (or other set) icon reference on icon and button blocks. */
export type IconReference = {
	iconSet?: IconSetId;
	iconName: string;
	size?: number;
	color?: string;
	strokeWidth?: number;
};

/** Text block content; button blocks reuse this kind with link fields. */
export type TextBlockContent = {
	kind: "text";
	value: string;
	textAlign?: string;
	dropCap?: boolean;
	format?: "html";
	level?: number;
	url?: string;
	linkTarget?: "_self" | "_blank";
	target?: string;
	rel?: string;
	title?: string;
	className?: string;
	icon?: IconReference;
	iconPosition?: "left" | "right";
	iconOnly?: boolean;
};

/** Discriminated union for block content payloads. */
export type BlockContent =
	| TextBlockContent
	| { kind: "markdown"; value: string; textAlign?: string }
	| {
			kind: "media";
			url: string;
			alt?: string;
			caption?: string;
			mediaType: "image" | "video" | "audio";
	  }
	| { kind: "html"; value: string; sanitized: boolean }
	| { kind: "structured"; data: Record<string, unknown> }
	| { kind: "empty" }
	| undefined;

/** Page builder block configuration stored on pages, posts, and templates. */
export type BlockConfig = {
	id: string;
	name: string;
	type: "block" | "container";
	parentId: string | null;
	label?: string;
	category?: "basic" | "form" | "layout" | "media" | "advanced" | "post";
	content: BlockContent;
	styles?: Record<string, string | number | null | undefined>;
	customCss?: string;
	children?: BlockConfig[];
	settings?: Record<string, unknown>;
	requires?: string;
	isReactive?: boolean;
	other?: Record<string, unknown>;
};

export type PageVersionEntry = {
	version: number;
	updatedAt: string;
	blocks: BlockConfig[];
	authorId?: string;
	message?: string;
};

export type Post = {
	id: string;
	title: string;
	slug: string;
	content?: string | null;
	excerpt?: string | null;
	status: string;
	blogId: string;
	authorId: string;
	blocks?: BlockConfig[] | null;
	featuredImageId?: string | null;
	publishedAt?: string | Date | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	other?: Record<string, unknown> | null;
	version?: number;
	categories?: string[];
	tags?: string[];
	isImported?: boolean;
	importSource?: string;
};

export type Page = {
	id: string;
	title: string;
	slug: string;
	content?: string | null;
	status: string;
	siteId: string;
	authorId?: string;
	blocks?: BlockConfig[] | null;
	version?: number;
	history?: PageVersionEntry[];
	publishedAt?: string | Date | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	other?: PageOtherSettings | null;
};

export type Blog = {
	id: string;
	name: string;
	slug: string;
	status: string;
	siteId: string;
	pageId?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type Comment = {
	id: string;
	postId: string;
	content: string;
	status: string;
	authorId?: string | null;
	authorName?: string | null;
	authorEmail?: string | null;
	parentId?: string | null;
	siteId?: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type Media = {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	alt?: string | null;
	caption?: string | null;
	description?: string | null;
	siteId?: string;
	uploadedBy?: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type User = {
	id: string;
	username: string;
	email: string;
	name?: string | null;
	role?: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type Site = {
	id: string;
	name: string;
	siteUrl?: string | null;
	description?: string | null;
	isDefault?: boolean;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type SiteInfo = {
	id: string;
	logoUrl?: string | null;
	faviconUrl?: string | null;
	activeThemeId?: string | null;
};

export type Template = {
	id: string;
	name: string;
	type: "header" | "footer" | "page" | "post" | "popup";
	description?: string | null;
	blocks?: BlockConfig[] | null;
	settings?: Record<string, unknown> | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type Theme = {
	id: string;
	name: string;
	slug: string;
	version?: string;
	isActive?: boolean;
	siteId?: string;
};

export type Plugin = {
	id: string;
	name: string;
	description?: string | null;
	runsWhen?: string;
	authorId: string;
	status: string;
	version: string;
	requires: string;
	isPaid?: boolean;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type Option = {
	id?: string;
	name: string;
	value: unknown;
	siteId?: string;
};

export type GeneralSettings = {
	siteName: string;
	siteDescription: string;
	siteUrl: string;
	adminEmail: string;
	timezone: string;
	dateFormat: string;
	timeFormat: string;
};

export type WritingSettings = {
	richTextEnabled: boolean;
	autosaveEnabled: boolean;
	syntaxHighlighting: boolean;
};

export type ReadingSettings = {
	postsPerPage: number;
	rssPosts: number;
	rssEnabled: boolean;
	discourageSearchIndexing: boolean;
};

export type DiscussionSettings = {
	enableComments: boolean;
	moderateComments: boolean;
	emailNotifications: boolean;
	enableRegistration: boolean;
	defaultRole: string;
};

export type SystemSettingsSection = {
	cachingEnabled: boolean;
	compressionEnabled: boolean;
	securityHeadersEnabled: boolean;
	debugMode: boolean;
	restApiEnabled: boolean;
	graphqlEnabled: boolean;
	webhooksEnabled: boolean;
};

export type Settings = {
	general: GeneralSettings;
	writing: WritingSettings;
	reading: ReadingSettings;
	discussion: DiscussionSettings;
	system: SystemSettingsSection;
};

export type PartialSettings = {
	general?: Partial<GeneralSettings>;
	writing?: Partial<WritingSettings>;
	reading?: Partial<ReadingSettings>;
	discussion?: Partial<DiscussionSettings>;
	system?: Partial<SystemSettingsSection>;
};

export type DashboardStats = {
	posts: number;
	pages: number;
	comments: number;
	users: number;
	siteId: string;
};

export type HealthResponse = {
	status: string;
	timestamp: string;
};

export type SetupStatus = {
	isSetup: boolean;
};

export type AuthUser = {
	id: string;
	username: string;
	email: string;
	name?: string | null;
};

export type PaginatedResponse<TItem, TKey extends string> = {
	[K in TKey]: TItem[];
} & {
	total: number;
	page: number;
	per_page: number;
	total_pages: number;
};

export type ApiEnvelope<T> = {
	status: string;
	data: T;
	siteId?: string;
};

export type DeleteMessage = {
	message: string;
};

export type PublicPage = Page;
export type PublicPost = Post;

export type PreviewShareToken = {
	token: string;
	contentType: "page" | "post" | "template";
	contentId: string;
	expiresAt: string;
	expiresInSeconds: number;
	previewUrl: string;
	apiUrl?: string;
};

export type PageHistoryResponse = {
	pageId: string;
	currentVersion: number;
	history: PageVersionEntry[];
};

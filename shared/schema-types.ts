import type {
	users,
	comments,
	sites,
	roles,
	userRoles,
	pages,
	templates,
	themes,
	plugins,
	options,
	blogs,
	posts,
	media,
	sessions,
} from "./schema";
import type { CSSProperties } from "react";

// User types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Comment types
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// Site types
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;

// Role types
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// UserRole types
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// Page version history entry (page-level, not per block)
export interface PageVersionEntry {
	version: number;
	updatedAt: string; // ISO timestamp
	blocks: BlockConfig[];
	authorId?: string;
	message?: string;
}

// Page types
export type Page = typeof pages.$inferSelect & {
	version?: number;
	history?: PageVersionEntry[];
};
export type NewPage = typeof pages.$inferInsert & {
	version?: number;
	history?: PageVersionEntry[];
};
export type PageDraft = Page & { localVersion?: number };

// Template types
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

// Theme types
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;

// Plugin types
export type Plugin = typeof plugins.$inferSelect;
export type NewPlugin = typeof plugins.$inferInsert;

// Option types
export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;

// Blog types
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;

// Post types
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

// Media types
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

// Session types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Block configuration types

/**
 * Discriminated union for block content
 * Each content type has a unique 'kind' discriminator for type-safe handling
 */
export type BlockContent =
	| {
			kind: "text";
			value: string;
			textAlign?: string;
			dropCap?: boolean;
			/** When "html", `value` holds sanitized inline HTML (e.g. links/bold from imports) and should be rendered as HTML, not escaped. */
			format?: "html";
			/** Heading level (1-6) for core/heading; ignored by other text blocks. */
			level?: number;
	  }
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

/** Custom meta tag entry for SEO */
export interface MetaTagEntry {
  name: string;
  content: string;
}

/** Per-page SEO settings stored in page.other.seo */
export interface PageSeoSettings {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  customMeta?: MetaTagEntry[];
}

/** Per-page design settings stored in page.other.design */
export interface PageDesignSettings {
  fontFamily?: string;
  containerWidth?: string;
  padding?: string;
  backgroundColor?: TokenEntry;
  textColor?: TokenEntry;
}

/** Per-page icon settings stored in page.other.icons */
export interface PageIconSettings {
  /** Default icon set for new icon/button blocks on this page */
  defaultSet: 'lucide' | 'react-icons' | 'svgl' | 'all';

  /**
   * When defaultSet is 'react-icons', optionally restrict to specific prefixes.
   * Empty array or undefined = all react-icons sets.
   */
  allowedSets?: string[]; // e.g., ['lu', 'tb', 'fa6']

  /** Default icon size for new icons on this page */
  defaultSize?: number; // px, default 24
}

/** Structure for page.other jsonb field */
export interface PageOther {
  seo?: PageSeoSettings;
  design?: PageDesignSettings;
  icons?: PageIconSettings;
  [key: string]: unknown;
}

/**
 * Core block configuration for PageBuilder runtime
 * Used during editing and rendering
 * 
 * Blocks are persisted to database using BlockConfig directly (in posts.blocks, templates.blocks, pages.blocks).
 * Version tracking happens at the page level via PageVersionEntry, not at individual block level.
 * This ensures atomic rollback of entire page state rather than per-block versioning.
 */

/**
 * Design token entry for a single CSS property.
 * Stores either a Tailwind token reference (value+variant) or a custom value (style).
 */
export interface TokenEntry {
  property: string;         // CSS property: "backgroundColor", "paddingTop", "fontSize"
  value: string;            // base token: "blue", "5", "lg" (empty string when custom)
  variant: string | null;   // shade/variant: "500", null
  alias: string;            // Tailwind prefix hint for UI: "bg", "pt", "text"
  modifier?: string;        // optional state/responsive: "hover", "md", "focus"
  other?: string;           // catch-all for values that don't fit structured fields
  style?: string;           // custom raw value: "23", "#ff5500", "1.5" (set when user picks custom)
  unitCategory?: string;    // category for unit resolution: "spacing", "font", "dimension", "border"
}

/** Entry animation config — scroll-triggered via AOS */
export interface EntryAnimation {
  name: string;        // Animate.css name: "fadeInUp", "bounceIn", "zoomIn"
  duration?: number;   // ms (default: 1000)
  delay?: number;      // ms (default: 0)
  once?: boolean;      // Play once only? (default: true)
}

/** Hover animation config — CSS :hover rule */
export interface HoverAnimation {
  name: string;        // Animate.css name: "pulse", "rubberBand", "tada"
}

/** Loop animation config — continuous CSS animation */
export interface LoopAnimation {
  name: string;        // Animate.css name: "bounce", "heartBeat", "swing"
}

/** Block animation configuration — one animation per category max */
export interface BlockAnimation {
  entry?: EntryAnimation;
  hover?: HoverAnimation;
  loop?: LoopAnimation;
}

/** Placement among siblings inside flex/grid parents; stored on styles, stripped DOM-side for primitives. */
export interface BlockSiblingPlacementStyles {
	/** `null` clears a previous alignment (required because `deepMerge` ignores `undefined` updates). */
	contentAlignHorizontal?: "left" | "center" | "right" | null;
	contentAlignVertical?: "top" | "middle" | "bottom" | null;
}

export interface BlockConfig {
	// Core identity & type
	id: string; // Unique instance ID
	name: string; // Canonical machine key (e.g., 'core/heading', 'core/paragraph')
	type: "block" | "container"; // Structural kind: can this block have children?
	parentId: string | null; // Parent block ID or null for root-level blocks

	// Display metadata
	label?: string; // User-facing display name (e.g., 'Heading', 'Two Columns')
	category?: "basic" | "layout" | "media" | "advanced" | "post";

	// Content - Discriminated union for type-safe handling
	// - For text blocks: { kind: 'text', value: '...' }
	// - For media blocks: { kind: 'media', url: '...', mediaType: 'image' }
	// - For containers: { kind: 'structured', data: { gap, alignment, ... } }
	content: BlockContent;

	// Styling (three layers: typed styles → block dev CSS → user CSS)
	styles?: CSSProperties & BlockSiblingPlacementStyles; // inline CSS + sibling placement controls
	customCss?: string; // CSS string defined by block developer

	// Container support (ONLY for type: "container")
	// Regular blocks (type: "block") should NOT have children
	children?: BlockConfig[];

	// Configuration
	settings?: Record<string, any>; // Block settings/options

	// Compatibility & rendering
	requires?: string; // Minimal NextPress version: "^4.0", ">=3.2.0", "~5.1"
	isReactive?: boolean; // If true, renders as React component in renderer

	// User overrides & extensions
	other?: {
		css?: string;
		classNames?: string;
		js?: string;
		html?: string;
		attributes?: Record<string, any>;
		metadata?: Record<string, any>;
		tokenMap?: Record<string, TokenEntry>;
		units?: Record<string, string>;
		animation?: BlockAnimation | null;
		/** Z-order among siblings inside layout containers (group, container, columns, etc.). Higher draws on top. */
		stackLayer?: number;
		/** Per-device style overrides merged on top of `styles` in tablet/mobile preview. */
		deviceStyles?: {
			tablet?: CSSProperties;
			mobile?: CSSProperties;
		};
	}
}

// ─── Template Variables & Conditions ─────────────────────────────────────────

/** A single variable definition for the UI picker */
export interface VariableDefinition {
  key: string;           // e.g., "title", "url", "name"
  label: string;         // Human-readable: "Post Title"
  description: string;   // Tooltip description
  example?: string;      // Example value for preview
}

/** A namespace groups related variables together */
export interface VariableNamespaceUI {
  name: string;          // e.g., "site", "post", "author"
  label: string;         // Human-readable: "Site", "Post", "Author"
  description: string;   // Namespace description
  variables: VariableDefinition[];
}

/** A single display condition for template/block visibility */
export interface DisplayCondition {
  id: string;            // Unique ID for the condition row
  type: string;          // e.g., "is_home", "is_single", "post_in_category"
  operator: "is" | "is_not";
  value?: string;        // e.g., category slug, page slug, role name
  logic?: "and" | "or";  // How this condition combines with the previous one
}

/** Condition type definition for the UI builder */
export interface ConditionTypeDefinitionUI {
  type: string;          // Machine key: "is_home"
  label: string;         // Human-readable: "Is Homepage"
  description: string;   // Tooltip description
  hasValue: boolean;     // Does this condition need a value input?
  valueType?: "text" | "select";
  valueOptions?: { value: string; label: string }[];
}

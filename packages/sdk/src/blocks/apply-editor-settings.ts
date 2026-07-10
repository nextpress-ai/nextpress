import type { BlockConfig, BlockContent, IconReference } from "../types/domain.js";
import { BLOCK_DEFINITIONS, type BlockName } from "./block-definitions.js";
import type { BlockEditorSettings } from "./block-editor-settings.js";
import type { BlockStyles } from "./block-params.js";
import { createBlockId } from "./create-block-id.js";
import { applySanitizedBlockOverrides, sanitizeHtmlBlockContent } from "../sanitize/apply-block-overrides.js";
import { serializeStructuredContent } from "./serialize-block-content.js";

const GROUP_LAYOUT_KEYS = new Set([
	"display",
	"flexDirection",
	"flexWrap",
	"alignItems",
	"justifyContent",
	"gap",
	"rowGap",
	"columnGap",
	"gridTemplateColumns",
	"gridTemplateRows",
	"width",
	"maxWidth",
	"minWidth",
	"height",
	"maxHeight",
	"minHeight",
	"overflow",
]);

const COLUMNS_VISUAL_KEYS = new Set(["gap", "direction"]);

/** Strips layout CSS from semantic content — layout belongs on `styles` only. */
const stripLayoutFromSemantic = (
	name: BlockName,
	semantic: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
	if (!semantic) return semantic;
	const out = { ...semantic };
	if (name === "core/group") {
		for (const key of GROUP_LAYOUT_KEYS) delete out[key];
	}
	if (name === "core/columns") {
		for (const key of COLUMNS_VISUAL_KEYS) delete out[key];
	}
	return out;
};

const buildTextKindContent = (
	semantic: Record<string, unknown> | undefined,
	defaultContent: BlockContent,
): BlockContent => {
	const base = defaultContent as Extract<BlockContent, { kind: "text" }>;
	const text = typeof semantic?.text === "string" ? semantic.text : semantic?.value ?? base.value;
	const level =
		typeof semantic?.level === "number"
			? semantic.level
			: typeof base.level === "number"
				? base.level
				: undefined;
	const icon =
		semantic?.icon &&
		typeof semantic.icon === "object" &&
		typeof (semantic.icon as IconReference).iconName === "string"
			? (semantic.icon as IconReference)
			: undefined;
	return {
		kind: "text",
		value: typeof text === "string" ? text : String(text ?? ""),
		...(level !== undefined ? { level } : {}),
		...(typeof semantic?.url === "string" ? { url: semantic.url } : {}),
		...(typeof semantic?.linkTarget === "string"
			? { linkTarget: semantic.linkTarget as "_self" | "_blank" }
			: {}),
		...(icon ? { icon } : {}),
		...(semantic?.iconPosition === "left" || semantic?.iconPosition === "right"
			? { iconPosition: semantic.iconPosition }
			: {}),
		...(typeof semantic?.iconOnly === "boolean" ? { iconOnly: semantic.iconOnly } : {}),
	};
};

const buildMediaKindContent = (
	semantic: Record<string, unknown> | undefined,
	defaultContent: BlockContent,
): BlockContent => {
	const base = defaultContent as Extract<BlockContent, { kind: "media" }>;
	return {
		kind: "media",
		url: typeof semantic?.url === "string" ? semantic.url : base.url ?? "",
		mediaType: base.mediaType,
		...(typeof semantic?.alt === "string" ? { alt: semantic.alt } : {}),
		...(typeof semantic?.caption === "string" ? { caption: semantic.caption } : {}),
	};
};

const buildContent = (name: BlockName, editorSettings: BlockEditorSettings): BlockContent => {
	const def = BLOCK_DEFINITIONS[name];
	const defaultContent = def.defaultContent();
	const semantic = stripLayoutFromSemantic(
		name,
		editorSettings.content as Record<string, unknown> | undefined,
	);

	if (defaultContent && typeof defaultContent === "object" && "kind" in defaultContent) {
		if (defaultContent.kind === "structured") {
			return serializeStructuredContent({
				name,
				content: semantic,
			});
		}
		if (defaultContent.kind === "text") {
			return buildTextKindContent(semantic, defaultContent);
		}
		if (defaultContent.kind === "media") {
			return buildMediaKindContent(semantic, defaultContent);
		}
		if (defaultContent.kind === "markdown") {
			return {
				kind: "markdown",
				value:
					typeof semantic?.value === "string"
						? semantic.value
						: (defaultContent as Extract<BlockContent, { kind: "markdown" }>).value,
			};
		}
		if (defaultContent.kind === "html") {
			const raw =
				typeof semantic?.value === "string"
					? semantic.value
					: (defaultContent as Extract<BlockContent, { kind: "html" }>).value;
			const sanitized =
				typeof semantic?.sanitized === "boolean" ? semantic.sanitized : true;
			return {
				kind: "html",
				value: sanitizeHtmlBlockContent(raw, sanitized),
				sanitized,
			};
		}
	}

	return defaultContent;
};

export type ApplyEditorSettingsParams = {
	name: BlockName;
	id?: string;
	parentId?: string | null;
	label?: string;
	children?: BlockConfig[];
	html?: string;
	js?: string;
	css?: string;
	settings: BlockEditorSettings;
	/** Optional style fallback when migrating flat callers — prefer `settings.styles`. */
	styles?: BlockStyles;
};

/**
 * Maps nested editor settings to a persisted `BlockConfig`.
 * Never dual-writes layout CSS into `content`.
 */
export const applyEditorSettings = ({
	name,
	id,
	parentId,
	label,
	children,
	html,
	js,
	css,
	settings,
	styles,
}: ApplyEditorSettingsParams): BlockConfig => {
	const def = BLOCK_DEFINITIONS[name];
	const built: BlockConfig = {
		id: id ?? createBlockId(),
		name,
		type: def.type,
		parentId: parentId ?? null,
		label: label ?? def.label,
		category: def.category,
		content: buildContent(name, settings),
		styles: settings.styles ?? styles ?? def.defaultStyles,
		settings: settings.advanced ?? {},
		children,
	};
	return applySanitizedBlockOverrides(built, { html, js, css });
};

import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockData } from "./react/block-types";
import type { TokenEntry, BlockAnimation } from "@shared/schema-types";
import { getEntryAnimationAttributes } from "@shared/animation-utils";

/**
 * Converts camelCase CSS property to kebab-case for CSS rules.
 */
function camelToKebab(str: string): string {
	return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Resolves tokenMap entries to inline styles for SSR.
 * All entries (token-based and custom) store their resolved CSS value in entry.style.
 * For custom entries with unitCategory, the unit is appended if the style is purely numeric.
 */
function resolveTokenMapForSSR(
	blockId: string,
	tokenMap: Record<string, TokenEntry>,
	units: Record<string, string>,
): { style: Record<string, string>; modifierCSS: string } {
	const style: Record<string, string> = {};
	const modifierEntries: Array<{ entry: TokenEntry; resolvedValue: string }> = [];

	for (const entry of Object.values(tokenMap)) {
		let resolvedValue: string | null = null;

		if (entry.style) {
			// If the style is purely numeric and has a unitCategory, append the active unit
			const isNumeric = /^\d*\.?\d+$/.test(entry.style);
			if (isNumeric && entry.unitCategory && units[entry.unitCategory]) {
				resolvedValue = `${entry.style}${units[entry.unitCategory]}`;
			} else {
				resolvedValue = entry.style;
			}
		}

		if (!resolvedValue) continue;

		if (entry.modifier) {
			modifierEntries.push({ entry, resolvedValue });
		} else {
			style[entry.property] = resolvedValue;
		}
	}

	// Generate modifier CSS rules using blockId
	const modifierCSS = modifierEntries
		.map(({ entry, resolvedValue }) => {
			if (!entry.modifier) return "";
			const cssProp = camelToKebab(entry.property);
			const selector = `.block-${blockId}`;

			// State modifiers: hover, focus, active, etc.
			const stateMap: Record<string, string> = {
				hover: ":hover", focus: ":focus", active: ":active",
				"focus-within": ":focus-within", "focus-visible": ":focus-visible",
				disabled: ":disabled", first: ":first-child", last: ":last-child",
			};
			if (stateMap[entry.modifier]) {
				return `${selector}${stateMap[entry.modifier]} { ${cssProp}: ${resolvedValue}; }`;
			}

			// Responsive modifiers: sm, md, lg, xl, 2xl
			const breakpoints: Record<string, string> = {
				sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px",
			};
			if (breakpoints[entry.modifier]) {
				return `@media (min-width: ${breakpoints[entry.modifier]}) { ${selector} { ${cssProp}: ${resolvedValue}; } }`;
			}

			return "";
		})
		.filter(Boolean)
		.join("\n");

	return { style, modifierCSS };
}



/**
 * Collects modifier CSS rules for a block's tokenMap entries for SSR injection.
 * Called separately from block adaptation to keep concerns separate.
 */
export function collectBlockModifierCSS(block: BlockConfig): string {
	if (!block.other?.tokenMap) return "";
	const { modifierCSS } = resolveTokenMapForSSR(
		block.id,
		block.other.tokenMap,
		block.other?.units || {},
	);
	return modifierCSS;
}

/**
 * Transforms BlockConfig from database to BlockData for renderer
 * Handles all BlockConfig properties: styles, customCss, other, children, settings
 *
 * @param block - BlockConfig from database
 * @returns BlockData compatible with renderer, or null if block cannot be adapted
 */
export function adaptBlockConfigToBlockData(
	block: BlockConfig,
): BlockData | null {
	// If other.html override exists, skip component rendering
	// The renderer will handle this separately
	if (block.other?.html) {
		// Return a special marker that renderer can detect
		return {
			blockName: block.name as any,
			interactive: block.isReactive || false,
			htmlOverride: block.other.html,
			style: block.styles,
			className: block.other.classNames,
			customCss: block.customCss,
			userCss: block.other.css,
			attributes: block.other.attributes,
		} as any;
	}

	// Extract props from block.content based on kind
	const contentProps = extractContentProps(block.name, block.content);
	if (!contentProps) {
		console.warn(`Could not extract content props for block ${block.name}`);
		return null;
	}

	// Resolve tokenMap values for SSR (all entries have resolved CSS in entry.style)
	const tokenResult = block.other?.tokenMap
		? resolveTokenMapForSSR(block.id, block.other.tokenMap, block.other?.units || {})
		: { style: {}, modifierCSS: "" };
	const tokenStyles = tokenResult.style;

	// Merge styles: block.styles + content defaults + token custom values
	const mergedStyles = {
		...block.styles,
		...(contentProps.style || {}),
		...tokenStyles,
	};

	// Merge classNames
	const mergedClassName = [`block-${block.id}`, block.other?.classNames, contentProps.className]
		.filter(Boolean)
		.join(" ");

	// Recursively adapt children for container blocks
	const adaptedChildren = block.children
		? block.children
				.map((child) => adaptBlockConfigToBlockData(child))
				.filter((child): child is BlockData => child !== null)
		: undefined;

	// Build base BlockData
	const baseData: any = {
		blockName: block.name,
		interactive: block.isReactive || false,
		style: Object.keys(mergedStyles).length > 0 ? mergedStyles : undefined,
		className: mergedClassName || undefined,
		customCss: block.customCss,
		userCss: block.other?.css,
		attributes: {
			...block.other?.attributes,
			...(contentProps.attributes || {}),
			...(block.other?.animation?.entry ? getEntryAnimationAttributes(block.other.animation.entry) : {}),
		},
		// Merge settings into props
		...block.settings,
		// Add content-specific props
		...contentProps,
	};

	// Add children if present
	if (adaptedChildren && adaptedChildren.length > 0) {
		baseData.children = adaptedChildren;
	}

	return baseData as BlockData;
}

/**
 * Extracts props from BlockContent based on content kind and block name
 */
function extractContentProps(
	blockName: string,
	content: BlockContent | undefined,
): Record<string, any> | null {
	if (!content) {
		return {};
	}

	// Handle markdown block specially - stores content at content.content (not content.value)
	// This is different from the "markdown" kind which expects content.value
	if (blockName === "core/markdown") {
		// Content can be directly stored as { content: "...", className: "..." }
		const markdownContent = (content as any).content;
		if (typeof markdownContent === "string") {
			return {
				content: markdownContent,
				className: (content as any).className || "",
			};
		}
		// Fallback: try content.value for "markdown" kind
		return {
			content: (content as any).value || "",
			className: (content as any).className || "",
		};
	}

	// Handle different content kinds
	switch (content.kind) {
		case "text": {
			const props: any = {
				content: content.value || "",
			};

			// Block-specific extractions
			if (blockName === "core/heading") {
				// Heading-specific: level, anchor, textAlign
				props.level = (content as any).level || 2;
				props.anchor = (content as any).anchor;
				props.textAlign = content.textAlign || (content as any).textAlign;
			} else if (blockName === "core/paragraph") {
				// Paragraph-specific: textAlign, dropCap
				props.textAlign = content.textAlign || (content as any).textAlign;
				props.dropCap = content.dropCap || false;
			} else if (blockName === "core/button" || blockName === "core/buttons") {
				// Button-specific: link, target
				props.link = (content as any).link || (content as any).url;
				props.target = (content as any).target || (content as any).linkTarget;
				props.variant = (content as any).variant;
				// Icon support
				const icon = (content as any).icon;
				if (icon) {
					props.iconSet = icon.iconSet;
					props.iconName = icon.iconName;
					props.iconSize = icon.size;
					props.iconColor = icon.color;
				}
				props.iconPosition = (content as any).iconPosition || "left";
				props.iconOnly = (content as any).iconOnly || false;
			} else if (blockName === "core/list") {
				// List-specific: ordered, start
				props.ordered = (content as any).ordered || false;
				props.start = (content as any).start;
			} else if (blockName === "core/quote") {
				// Quote-specific: citation
				props.citation = (content as any).citation;
			} else if (blockName === "core/pullquote") {
				// Pullquote-specific: citation
				props.citation = (content as any).citation;
			}

			return props;
		}

		case "markdown": {
			return {
				content: content.value || "",
				textAlign: content.textAlign,
			};
		}

		case "media": {
			const props: any = {
				url: content.url,
				alt: content.alt || "",
				caption: content.caption,
				mediaType: content.mediaType,
			};

			// Media-specific extractions
			if (blockName === "core/image") {
				props.width = (content as any).width;
				props.height = (content as any).height;
				props.objectFit = (content as any).objectFit;
				// Image link properties
				props.href = (content as any).href;
				props.linkTarget =
					(content as any).linkTarget || (content as any).target;
				props.linkDestination = (content as any).linkDestination;
				props.rel = (content as any).rel;
				props.title = (content as any).title;
			} else if (blockName === "core/video") {
				props.autoplay = (content as any).autoplay;
				props.loop = (content as any).loop;
				props.controls = (content as any).controls;
				props.poster = (content as any).poster;
			} else if (blockName === "core/audio") {
				props.autoplay = (content as any).autoplay;
				props.loop = (content as any).loop;
				props.controls = (content as any).controls;
			} else if (blockName === "core/gallery") {
				props.images = (content as any).images || [];
				props.columns = (content as any).columns;
			} else if (blockName === "core/media-text") {
				props.mediaPosition = (content as any).mediaPosition || "left";
				props.verticalAlignment = (content as any).verticalAlignment;
				// Media-text link properties
				props.href = (content as any).href;
				props.linkTarget =
					(content as any).linkTarget || (content as any).target;
				props.rel = (content as any).rel;
				props.title = (content as any).title;
			} else if (blockName === "core/cover") {
				props.overlayColor = (content as any).overlayColor;
				props.overlayOpacity = (content as any).overlayOpacity;
				props.minHeight = (content as any).minHeight;
			}

			return props;
		}

		case "html": {
			return {
				content: content.value || "",
				sanitized: content.sanitized || false,
			};
		}

		case "structured": {
			// Extract structured data based on block type
			const data = content.data || {};

			if (blockName === "core/icon") {
				const icon = (data.icon as Record<string, unknown>) || {};
				return {
					iconSet: icon.iconSet || "lucide",
					iconName: icon.iconName || "star",
					iconSize: icon.size || 24,
					iconColor: icon.color || "currentColor",
					iconStrokeWidth: icon.strokeWidth || 2,
					link: data.link || undefined,
					linkTarget: data.linkTarget || undefined,
					label: data.label || undefined,
				};
			} else if (blockName === "core/columns") {
				return {
					gap: data.gap,
					minColumnWidth: data.minColumnWidth,
					verticalAlignment: data.verticalAlignment,
					horizontalAlignment: data.horizontalAlignment,
					direction: data.direction,
					layoutMode: data.layoutMode,
				};
			} else if (blockName === "core/file") {
				const href = typeof data.href === "string" ? data.href : "";
				return {
					url: href,
					filename: typeof data.fileName === "string" ? data.fileName : "",
					fileSize: typeof data.fileSize === "string" ? data.fileSize : "",
				};
			} else if (blockName === "core/group") {
				return {
					layout: data.layout,
					tagName: data.tagName || "div",
				};
			} else if (blockName === "core/spacer") {
				return {
					height: data.height || "40px",
				};
			} else if (blockName === "core/buttons") {
				// Buttons are stored in content.data.buttons array
				// Each button has: id, text, url, linkTarget, rel, title, className
				return {
					buttons: data.buttons || [],
					layout: data.layout,
					orientation: data.orientation,
				};
			} else if (blockName === "core/table") {
				return {
					headers: data.headers,
					rows: data.rows,
					hasFixedLayout: data.hasFixedLayout || false,
				};
			} else if (blockName === "core/code") {
				return {
					content: data.content || "",
					language: data.language,
				};
			} else if (blockName === "core/preformatted") {
				return {
					content: data.content || "",
				};
			}

			// Generic structured data
			return { ...data };
		}

		case "empty": {
			return {};
		}

		default: {
			// Handle undefined or unknown content
			return {};
		}
	}
}

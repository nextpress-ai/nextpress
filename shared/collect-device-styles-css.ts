import type { BlockConfig } from "./schema-types.js";
import { BREAKPOINT_MAP, camelToKebab } from "./token-resolution.js";
import { readBlockDeviceStyles } from "./block-device-styles.js";

/** Max-width media for mobile overrides (below md). */
const MOBILE_MAX = "767px";

/** Tablet range: md up to lg - 1 */
const TABLET_MIN = BREAKPOINT_MAP.md;
const TABLET_MAX = "1023px";

type CssPropertyRecord = Record<string, string | number | null | undefined>;

/** Serializes CSSProperties to a CSS rule body, skipping null/undefined. */
function stylesToRuleBody(styles: CssPropertyRecord): string {
	return Object.entries(styles)
		.filter(([, v]) => v != null && v !== "")
		.map(([key, value]) => `${camelToKebab(key)}: ${value};`)
		.join(" ");
}

/** Generates @media CSS for a single block's per-device style overrides. */
export function collectBlockDeviceStylesCSS(block: BlockConfig): string {
	const deviceStyles = readBlockDeviceStyles(block);
	const selector = `.block-${block.id}`;
	const rules: string[] = [];

	const mobileBody = deviceStyles.mobile ? stylesToRuleBody(deviceStyles.mobile as CssPropertyRecord) : "";
	if (mobileBody) {
		rules.push(`@media (max-width: ${MOBILE_MAX}) { ${selector} { ${mobileBody} } }`);
	}

	const tabletBody = deviceStyles.tablet ? stylesToRuleBody(deviceStyles.tablet as CssPropertyRecord) : "";
	if (tabletBody) {
		rules.push(
			`@media (min-width: ${TABLET_MIN}) and (max-width: ${TABLET_MAX}) { ${selector} { ${tabletBody} } }`,
		);
	}

	return rules.join("\n");
}

/** Walks a block tree and collects all device override CSS. */
export function collectDeviceStylesCSS(blocks: BlockConfig[]): string {
	const walk = (nodes: BlockConfig[]): string[] =>
		nodes.flatMap((block) => [
			collectBlockDeviceStylesCSS(block),
			...(block.children?.length ? walk(block.children) : []),
		]);

	return walk(blocks).filter(Boolean).join("\n");
}

import type { CSSProperties } from "react";
import type { BlockConfig } from "./schema-types.js";

export type BlockDeviceStyles = {
	tablet?: CSSProperties;
	mobile?: CSSProperties;
};

/** Reads per-device style overrides stored on the block. */
export function readBlockDeviceStyles(block: BlockConfig): BlockDeviceStyles {
	const raw = block.other?.deviceStyles;
	if (!raw || typeof raw !== "object") return {};
	return raw as BlockDeviceStyles;
}

export type DeviceView = "desktop" | "tablet" | "mobile";

/**
 * Merges base block styles with device overrides for canvas preview.
 * Desktop returns `block.styles` unchanged.
 */
export function resolveBlockDeviceStyles({
	block,
	device,
}: {
	block: BlockConfig;
	device: DeviceView;
}): CSSProperties | undefined {
	const base = block.styles;
	if (device === "desktop") return base;

	const overrides = readBlockDeviceStyles(block)[device];
	if (!overrides || Object.keys(overrides).length === 0) return base;
	if (!base) return { ...overrides };

	return { ...base, ...overrides };
}

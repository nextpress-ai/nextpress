import type { CSSProperties } from "react";
import type { BlockContent } from "./schema-types.js";

/**
 * How a video block plays, read the same way by the editor canvas and the published page.
 *
 * Browsers only autoplay a video that is muted. An autoplaying video that is not muted just sits
 * still, so autoplay always plays muted — the settings panel shows Muted as on and locked.
 */

export const VIDEO_FIT_VALUES = ["cover", "contain"] as const;
export type VideoFit = (typeof VIDEO_FIT_VALUES)[number];

export const VIDEO_PRELOAD_VALUES = ["auto", "metadata", "none"] as const;
export type VideoPreload = (typeof VIDEO_PRELOAD_VALUES)[number];

export type VideoPlayback = {
	controls: boolean;
	autoplay: boolean;
	loop: boolean;
	muted: boolean;
	playsInline: boolean;
	preload: VideoPreload;
	/** `cover` fills the box and crops; `contain` shows the whole frame. Unset = natural size. */
	objectFit?: VideoFit;
};

type VideoContentLike = {
	controls?: boolean;
	autoplay?: boolean;
	loop?: boolean;
	muted?: boolean;
	playsInline?: boolean;
	preload?: string;
	objectFit?: string;
};

const pick = <T extends string>(options: readonly T[], value: string | undefined): T | undefined =>
	options.find((option) => option === value);

export function readVideoPlayback(raw: BlockContent | VideoContentLike | null | undefined): VideoPlayback {
	// Video settings sit flat on media content; other content kinds simply have none of them.
	const content: VideoContentLike = raw && typeof raw === "object" ? (raw as VideoContentLike) : {};
	const autoplay = content.autoplay === true;
	return {
		controls: content.controls !== false,
		autoplay,
		loop: content.loop === true,
		muted: autoplay || content.muted === true,
		playsInline: content.playsInline !== false,
		preload: pick(VIDEO_PRELOAD_VALUES, content.preload) ?? "metadata",
		objectFit: pick(VIDEO_FIT_VALUES, content.objectFit),
	};
}

/** Styles for the `<video>` itself. The block's own styles stay on its wrapper, never on both. */
export function videoElementStyle({
	hasHeight,
	objectFit,
}: {
	hasHeight: boolean;
	objectFit?: VideoFit;
}): CSSProperties {
	return {
		display: "block",
		width: "100%",
		height: hasHeight || objectFit ? "100%" : "auto",
		...(objectFit ? { objectFit } : {}),
	};
}

/** One click in the editor: a silent, looping, full-bleed video with no player controls. */
export const BACKGROUND_VIDEO_CONTENT = {
	autoplay: true,
	muted: true,
	loop: true,
	controls: false,
	playsInline: true,
	preload: "auto",
	objectFit: "cover",
} as const satisfies VideoContentLike;

export const BACKGROUND_VIDEO_STYLES: CSSProperties = { width: "100%", height: "100%" };

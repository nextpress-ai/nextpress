/** Which screen a block or header piece is painted on. */
export type ScreenShow = "all" | "desktop" | "phone";

export const SCREEN_SHOW_OPTIONS: readonly { value: ScreenShow; label: string }[] = [
	{ value: "all", label: "Both" },
	{ value: "desktop", label: "Desktop" },
	{ value: "phone", label: "Mobile" },
];

export function readScreenShow(value: string | undefined | null): ScreenShow {
	if (value === "desktop" || value === "phone") return value;
	return "all";
}

/** Class the published CSS uses to hide a piece on the other screen. Empty when it shows everywhere. */
export function screenShowClass(value: ScreenShow | undefined): string {
	if (value === "desktop") return "is-screen-desktop";
	if (value === "phone") return "is-screen-phone";
	return "";
}

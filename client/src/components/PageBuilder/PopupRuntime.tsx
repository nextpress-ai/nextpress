import { useEffect } from "react";
import { initPopups } from "@shared/popup-runtime";

/**
 * Lets `#popup-<name>` links, the page address, close buttons and backdrops open and close
 * popups on the in-app visitor view and preview (published pages load `vendor/popup.js`).
 */
export function PopupRuntime({ contentKey }: { contentKey: string }) {
	useEffect(() => initPopups(), [contentKey]);
	return null;
}

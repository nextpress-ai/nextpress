import { useEffect } from "react";
import { initForms } from "@shared/form-runtime";

/**
 * Sends Form blocks in the background on the in-app visitor view and preview
 * (published pages load `vendor/form.js`).
 */
export function FormRuntime({ contentKey }: { contentKey: string }) {
	useEffect(() => initForms(), [contentKey]);
	return null;
}

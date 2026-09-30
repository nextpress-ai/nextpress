import { useEffect } from "react";
import { initForms } from "@shared/form-runtime";
import { initSelects } from "@shared/select-runtime";

/**
 * Sends Form blocks in the background and turns dropdowns into the styled ones on the in-app
 * visitor view and preview (published pages load `vendor/form.js` and `vendor/select.js`).
 */
export function FormRuntime({ contentKey }: { contentKey: string }) {
	useEffect(() => {
		const stopForms = initForms();
		const stopSelects = initSelects();
		return () => {
			stopForms();
			stopSelects();
		};
	}, [contentKey]);
	return null;
}

import { toast } from "sonner";

/** Errors stay visible long enough to read; user can dismiss via close button. */
const ERROR_TOAST_DURATION_MS = 12_000;
const SUCCESS_TOAST_DURATION_MS = 4_000;

type ApiError = Error & { status?: number; code?: string };

/** Shows a Sonner error toast (richColors via app Toaster). */
export function showErrorToast(message: string): void {
	toast.error(message, { duration: ERROR_TOAST_DURATION_MS });
}

/** Shows a Sonner success toast. */
export function showSuccessToast(message: string): void {
	toast.success(message, { duration: SUCCESS_TOAST_DURATION_MS });
}

/** Maps create-page API failures to a clear, user-facing message. */
export function resolveCreatePageError(error: unknown): string {
	const err = error as ApiError;
	const raw = typeof err?.message === "string" ? err.message.trim() : "";

	if (
		err?.status === 409 ||
		err?.code === "PAGE_SLUG_EXISTS" ||
		/already exists|duplicate|unique|pages_slug_unique/i.test(raw)
	) {
		return "This page already exists. Choose a different URL slug.";
	}

	if (err?.status === 401) {
		return "You must be signed in to create pages.";
	}

	if (raw) return raw;

	return "Could not create the page. Please try again.";
}

/** Maps duplicate-page API failures to a clear next step. */
export function resolveDuplicatePageError(error: unknown): string {
	const err = error as ApiError;
	const raw = typeof err?.message === "string" ? err.message.trim() : "";

	if (err?.status === 404) {
		return "That page is gone. Refresh the list and try again.";
	}
	if (err?.status === 401) {
		return "You must be signed in to duplicate pages.";
	}
	if (err?.status === 409 || err?.code === "PAGE_SLUG_EXISTS") {
		return "A page with that name already exists. Choose a different name.";
	}
	if (raw) return raw;
	return "Could not duplicate the page. Please try again.";
}

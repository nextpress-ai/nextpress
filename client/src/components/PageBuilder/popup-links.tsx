import { createContext, useContext, useMemo, type JSX, type ReactNode } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { collectPopups, popupHref, readPopupSlugFromHref, type PopupSummary } from "@shared/popup-model";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SettingsLabel } from "./shared";

type PagePopups = {
	popups: PopupSummary[];
	/** How many places on the page link to each popup (`#popup-<slug>`), by slug. */
	linkCounts: Record<string, number>;
};

const PagePopupsContext = createContext<PagePopups>({ popups: [], linkCounts: {} });

const countLinks = (blocks: readonly BlockConfig[], slugs: readonly string[]): Record<string, number> => {
	// Links live in many shapes (button url, header action href, icon link…); the saved JSON
	// holds each one as the exact text "#popup-<slug>".
	const text = JSON.stringify(blocks);
	return Object.fromEntries(
		slugs.map((slug) => [slug, text.split(`"${popupHref(slug)}"`).length - 1]),
	);
};

/** Walks the canvas once so link fields can offer "Open a popup" and popups can count their links. */
export function EditorPopupsProvider({
	blocks,
	children,
}: {
	blocks: readonly BlockConfig[];
	children: ReactNode;
}): JSX.Element {
	const value = useMemo(() => {
		const popups = collectPopups(blocks);
		return { popups, linkCounts: countLinks(blocks, popups.map((popup) => popup.slug)) };
	}, [blocks]);
	return <PagePopupsContext.Provider value={value}>{children}</PagePopupsContext.Provider>;
}

export const usePagePopups = (): PagePopups => useContext(PagePopupsContext);

const NO_POPUP = "__none__";

/**
 * "Or open a popup" under a link field. Picking one writes `#popup-<name>` as the link; picking
 * "No popup" clears it. Hidden when the page has no popups.
 */
export function PopupLinkPicker({
	id,
	value,
	onChange,
}: {
	id: string;
	value: string | undefined;
	onChange: (href: string) => void;
}): JSX.Element | null {
	const { popups } = usePagePopups();
	if (popups.length === 0) return null;
	const current = readPopupSlugFromHref(value);
	const known = popups.some((popup) => popup.slug === current);

	return (
		<div className="mt-2 space-y-1">
			<SettingsLabel htmlFor={id}>Or open a popup</SettingsLabel>
			<Select
				value={current && known ? current : NO_POPUP}
				onValueChange={(slug) => onChange(slug === NO_POPUP ? "" : popupHref(slug))}
			>
				<SelectTrigger id={id} className="h-9 text-sm">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={NO_POPUP}>No popup</SelectItem>
					{popups.map((popup) => (
						<SelectItem key={popup.id} value={popup.slug}>
							{popup.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{current && !known ? (
				<p className="text-xs text-npb-status-error">
					No popup on this page is called “{current}”. Pick one above or change the link.
				</p>
			) : null}
		</div>
	);
}

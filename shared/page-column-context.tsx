import { createContext, useContext, type ReactNode } from "react";
import type { PageColumnInset } from "./page-shell-styles.js";

const PageColumnContext = createContext<PageColumnInset | null>(null);

/** Hands the page column to a header inside this shell, so it can line up without guessing. */
export function PageColumnProvider({
	value,
	children,
}: {
	value: PageColumnInset;
	children: ReactNode;
}) {
	return <PageColumnContext.Provider value={value}>{children}</PageColumnContext.Provider>;
}

/** The surrounding page column, or nothing when this header is not inside a page shell. */
export function usePageColumnInset(): PageColumnInset | null {
	return useContext(PageColumnContext);
}

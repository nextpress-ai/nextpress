import { createContext, useContext } from "react";
import { DEFAULT_ACCORDION_CONTENT, type AccordionContent } from "@shared/accordion-model";

/**
 * Items draw their icon and decide "open at start" from the accordion around them. On the
 * canvas they are rendered by the shared child list, so the accordion hands its settings down
 * through context instead of props.
 */
export type AccordionCanvasContext = {
	content: AccordionContent;
	/** Item ids in order, so an item knows whether it is the first one. */
	itemIds: readonly string[];
};

export const AccordionContext = createContext<AccordionCanvasContext>({
	content: DEFAULT_ACCORDION_CONTENT,
	itemIds: [],
});

export const useAccordionContext = (): AccordionCanvasContext => useContext(AccordionContext);

import React from "react";
import { HeaderBar } from "@shared/header-view";
import type { HeaderContent } from "@shared/header-model";

/** Canvas header — same bar as publish, links do not leave the editor. */
export function HeaderCanvas({ content }: { content: HeaderContent }) {
	return <HeaderBar content={content} disableLinks={true} />;
}

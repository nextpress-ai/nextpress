import React from "react";
import { PanelTop } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import {
	DEFAULT_HEADER_CONTENT,
	normalizeHeaderContent,
	readHeaderContent,
	type HeaderContent,
} from "@shared/header-model";
import { HeaderCanvas } from "./header-canvas";
import { HeaderSettings } from "./header-settings";

const HeaderBlock = createBlockDefinition<HeaderContent>({
	id: "core/header",
	label: "Header",
	icon: PanelTop,
	description: "Site header with brand, links, and buttons",
	category: "layout",
	// Children only appear in the "Blocks" layout, but the header must be a container to hold them.
	isContainer: true,
	handlesOwnChildren: true,
	defaultContent: DEFAULT_HEADER_CONTENT,
	defaultStyles: {
		width: "100%",
		boxSizing: "border-box",
		padding: "0px",
		margin: "0px",
	},
	settings: HeaderSettings,
	hasSettings: true,
	parseContent: readHeaderContent,
	render: ({ content, value, isPreview, onNestedBlockChange }) => (
		<HeaderCanvas
			content={normalizeHeaderContent(content)}
			hostBlock={value}
			isPreview={isPreview}
			onNestedBlockChange={onNestedBlockChange}
		/>
	),
});

export default HeaderBlock;

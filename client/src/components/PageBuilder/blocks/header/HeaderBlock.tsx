import React from "react";
import { PanelTop } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import {
	DEFAULT_HEADER_CONTENT,
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
	defaultContent: DEFAULT_HEADER_CONTENT,
	defaultStyles: {
		width: "100%",
		padding: "0px",
		margin: "0px",
	},
	settings: HeaderSettings,
	hasSettings: true,
	parseContent: readHeaderContent,
	render: ({ content }) => (
		<HeaderCanvas content={{ ...DEFAULT_HEADER_CONTENT, ...content }} />
	),
});

export default HeaderBlock;

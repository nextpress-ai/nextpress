import type { BlockConfig } from "../types/domain.js";
import type { BlocksBuilder } from "./blocks-builder.types.js";

/**
 * Google-style search landing page built from dashboard blocks only.
 * Logo uses `core/image`; icons use `core/icon` (lucide); layout uses container/group/buttons.
 */
export const buildGoogleSearchPageBlocks = (blocks: BlocksBuilder): BlockConfig[] => {
	const mutedIcon = "#9aa0a6";
	const accentIcon = "#4285f4";

	const logo = blocks.image({
		url: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
		alt: "Google",
		styles: {
			maxWidth: "272px",
			width: "100%",
			height: "auto",
			margin: "0 auto",
			display: "block",
		},
	});

	const searchBar = blocks.group({
		data: {
			display: "flex",
			flexDirection: "row",
			alignItems: "center",
			gap: "4px",
			width: "100%",
		},
		styles: {
			backgroundColor: "#ffffff",
			border: "1px solid #dfe1e5",
			borderRadius: "24px",
			padding: "6px 8px 6px 4px",
			boxShadow: "0 1px 6px rgba(32,33,36,.16)",
			width: "100%",
			boxSizing: "border-box",
		},
		children: [
			blocks.icon({ iconName: "plus", size: 22, color: mutedIcon, label: "Add" }),
			blocks.icon({ iconName: "search", size: 20, color: mutedIcon, label: "Search" }),
			blocks.paragraph({
				text: "Search Google or type a URL",
				styles: {
					flex: "1 1 auto",
					margin: "0",
					padding: "10px 8px",
					color: "#70757a",
					fontSize: "16px",
				},
			}),
			blocks.icon({ iconName: "mic", size: 22, color: accentIcon, label: "Search by voice" }),
			blocks.icon({ iconName: "scan", size: 22, color: accentIcon, label: "Search by image" }),
		],
	});

	const actionButtons = blocks.buttons({
		data: { layout: "horizontal", gap: "12px" },
		styles: {
			display: "flex",
			flexDirection: "row",
			justifyContent: "center",
			flexWrap: "nowrap",
			width: "100%",
			gap: "12px",
		},
		children: [
			blocks.button({
				text: "Google Search",
				url: "https://www.google.com",
				linkTarget: "_blank",
				styles: {
					backgroundColor: "#f8f9fa",
					color: "#3c4043",
					padding: "11px 18px",
					borderRadius: "4px",
					border: "1px solid #f8f9fa",
					fontSize: "14px",
				},
			}),
			blocks.button({
				text: "I'm Feeling Lucky",
				url: "https://www.google.com/doodles",
				linkTarget: "_blank",
				styles: {
					backgroundColor: "#f8f9fa",
					color: "#3c4043",
					padding: "11px 18px",
					borderRadius: "4px",
					border: "1px solid #f8f9fa",
					fontSize: "14px",
				},
			}),
		],
	});

	const footer = blocks.paragraph({
		text: "Built with @nextpress-org/sdk · block layout · light theme",
		styles: {
			marginTop: "8px",
			color: "#70757a",
			fontSize: "14px",
			textAlign: "center",
		},
	});

	return [
		blocks.container({
			data: { maxWidth: "584px", gap: "20px" },
			styles: {
				minHeight: "100vh",
				backgroundColor: "#ffffff",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "48px 16px",
				margin: "0 auto",
				boxSizing: "border-box",
			},
			children: [logo, searchBar, actionButtons, footer],
		}),
	];
};

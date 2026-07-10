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
		settings: {
			content: {
				url: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
				alt: "Google",
			},
			styles: {
				maxWidth: "272px",
				width: "100%",
				height: "auto",
				margin: "0 auto",
				display: "block",
			},
		},
	});

	const searchBar = blocks.group({
		settings: {
			content: { tagName: "div" },
			styles: {
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: "4px",
				width: "100%",
				backgroundColor: "#ffffff",
				border: "1px solid #dfe1e5",
				borderRadius: "24px",
				padding: "6px 8px 6px 4px",
				boxShadow: "0 1px 6px rgba(32,33,36,.16)",
				boxSizing: "border-box",
			},
		},
		children: [
			blocks.icon({
				settings: {
					content: { icon: { iconName: "plus", iconSet: "lucide" }, label: "Add" },
					styles: { color: mutedIcon, width: "22px", height: "22px" },
				},
			}),
			blocks.icon({
				settings: {
					content: { icon: { iconName: "search", iconSet: "lucide" }, label: "Search" },
					styles: { color: mutedIcon, width: "20px", height: "20px" },
				},
			}),
			blocks.input({
				settings: {
					content: {
						type: "search",
						name: "q",
						placeholder: "Search Google or type a URL",
						defaultValue: "",
						ariaLabel: "Search",
					},
					styles: {
						flex: "1 1 auto",
						margin: "0",
						padding: "10px 8px",
						border: "none",
						outline: "none",
						backgroundColor: "transparent",
						color: "#70757a",
						fontSize: "16px",
						boxShadow: "none",
					},
				},
			}),
			blocks.icon({
				settings: {
					content: { icon: { iconName: "mic", iconSet: "lucide" }, label: "Search by voice" },
					styles: { color: accentIcon, width: "22px", height: "22px" },
				},
			}),
			blocks.icon({
				settings: {
					content: { icon: { iconName: "scan", iconSet: "lucide" }, label: "Search by image" },
					styles: { color: accentIcon, width: "22px", height: "22px" },
				},
			}),
		],
	});

	const actionButtons = blocks.buttons({
		settings: {
			content: { orientation: "horizontal", layout: "center" },
			styles: {
				display: "flex",
				flexDirection: "row",
				justifyContent: "center",
				flexWrap: "nowrap",
				width: "100%",
				gap: "12px",
			},
		},
		children: [
			blocks.button({
				settings: {
					content: { text: "Google Search", url: "https://www.google.com", linkTarget: "_blank" },
					styles: {
						backgroundColor: "#f8f9fa",
						color: "#3c4043",
						padding: "11px 18px",
						borderRadius: "4px",
						border: "1px solid #f8f9fa",
						fontSize: "14px",
					},
				},
			}),
			blocks.button({
				settings: {
					content: { text: "I'm Feeling Lucky", url: "https://www.google.com/doodles", linkTarget: "_blank" },
					styles: {
						backgroundColor: "#f8f9fa",
						color: "#3c4043",
						padding: "11px 18px",
						borderRadius: "4px",
						border: "1px solid #f8f9fa",
						fontSize: "14px",
					},
				},
			}),
		],
	});

	const footer = blocks.paragraph({
		settings: {
			content: { text: "Built with @nextpress-org/sdk · block layout · light theme" },
			styles: {
				marginTop: "8px",
				color: "#70757a",
				fontSize: "14px",
				textAlign: "center",
			},
		},
	});

	return [
		blocks.container({
			settings: {
				content: { tagName: "div" },
				styles: {
					maxWidth: "584px",
					minHeight: "100vh",
					backgroundColor: "#ffffff",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "48px 16px",
					gap: "24px",
					margin: "0 auto",
				},
			},
			children: [logo, searchBar, actionButtons, footer],
		}),
	];
};

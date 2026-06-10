// React is required for JSX transformation when using ReactDOMServer
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { BLOCK_COMPONENTS } from "./react/block-components";
import type { BlockConfig } from "@shared/schema-types";
import { collectBlockModifierCSS } from "@shared/token-resolution";

const HYDRATION_CONTAINER_ID = "react-island-";

/**
 * Loading placeholder HTML for interactive blocks
 */
function getLoadingPlaceholder(blockName: string): string {
  return `
		<div style="
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 60px;
			padding: 1rem;
			background: #f9fafb;
			border: 1px dashed #e5e7eb;
			border-radius: 0.375rem;
			color: #6b7280;
			font-size: 0.875rem;
		">
			<svg style="
				width: 1.25rem;
				height: 1.25rem;
				margin-right: 0.5rem;
				animation: spin 1s linear infinite;
			" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			Loading ${blockName}...
		</div>
		<style>
			@keyframes spin {
				from { transform: rotate(0deg); }
				to { transform: rotate(360deg); }
			}
		</style>
	`;
}

/**
 * Renders an array of BlockConfig objects into HTML string.
 * Interactive blocks are wrapped in hydration containers with loading placeholders.
 * @param blocks An array of BlockConfig objects with optional `isReactive` flag.
 * @returns A single string of HTML with hydration islands for interactive blocks.
 */
export function renderBlocksToHtml(blocks: BlockConfig[]): string {
  let fullHtml = "";

  for (const block of blocks) {
    const { name: blockName } = block;

    // Handle HTML override (if other.html is set)
    if (block.other?.html) {
      fullHtml += block.other.html;
      continue;
    }

    // 1. Look up the component in the registry
    const BlockComponent = BLOCK_COMPONENTS[blockName];

    if (!BlockComponent) {
      console.warn(`Unknown block: ${blockName}. Skipping render.`);
      continue;
    }

    try {
      // 2. Check if block is interactive via the flag
      const blockIsInteractive = block.isReactive === true;

      if (blockIsInteractive) {
        // Interactive block: Create hydration island
        // Generate a unique ID for this instance
        const uniqueId = `${HYDRATION_CONTAINER_ID}${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        // Render initial HTML (for SEO and initial display)
        const initialHtml = ReactDOMServer.renderToString(
          <BlockComponent {...block} />
        );

        // Create the 'Island' wrapper with loading placeholder
        // The placeholder will be replaced during hydration
        const loadingPlaceholder = getLoadingPlaceholder(blockName);

        // Escape quotes in JSON for HTML attributes
        const propsJson = JSON.stringify(block).replace(/'/g, "&#39;");

        fullHtml += `
					<div 
						id="${uniqueId}" 
						data-block-component="${blockName}"
						data-block-props='${propsJson}'
						style="position: relative;"
					>
						<div data-loading-placeholder style="display: block;">
							${loadingPlaceholder}
						</div>
						<div data-actual-content style="display: none;">
							${initialHtml}
						</div>
					</div>
				`;
      } else {
        // Static block: Use faster renderToStaticMarkup (no hydration needed)
        const blockHtml = ReactDOMServer.renderToStaticMarkup(
          <BlockComponent {...block} />
        );
        fullHtml += blockHtml;
      }
    } catch (error) {
      console.error(`Error rendering block ${blockName}:`, error);
      fullHtml += `<!-- Error rendering block: ${blockName} -->`;
    }
  }

  return fullHtml;
}

/**
 * Generates the hydration script tag to include in page
 */
export function getHydrationScript(): string {
  return `<script type="module" src="/renderer/scripts/hydrate.js"></script>`;
}
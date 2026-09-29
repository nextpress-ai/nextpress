import * as React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { buildGroupShellStyles, readGroupShellContent } from "@shared/group-shell-styles";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";
import { getBlockSiblingFlexItemStyles } from "@shared/block-container-placement";
import { FormHiddenFields } from "@shared/form-hidden-fields";
import { getBlockComponent, getRenderProps } from "../render-helpers";

/**
 * Form Block Component — a real `<form>` that posts to /api/forms/submit. `vendor/form.js` sends it
 * in the background and shows the result; with scripts off the browser posts it normally.
 * Children stack like a Group, so the published form matches the editor.
 */
export function FormBlock(block: BlockConfig) {
	const { style, className, attributes } = getRenderProps(block);
	const { outerStyle, innerStackStyle, stackDirection, isHorizontal } = buildGroupShellStyles({
		styles: style,
		content: readGroupShellContent(block.content),
		children: block.children?.map((child) => ({ styles: child.styles })),
	});

	return (
		<form
			className={["wp-block-form", className].filter(Boolean).join(" ")}
			data-np-form={block.id}
			action="/api/forms/submit"
			method="post"
			style={outerStyle}
			{...attributes}
		>
			<div className="wp-block-form__fields" style={innerStackStyle}>
				{(block.children ?? []).map((child) => {
					const ChildComponent = getBlockComponent(child.name);
					if (!ChildComponent) return null;
					return (
						<div
							key={child.id}
							style={{
								...getHorizontalFlexChildStyles({
									isHorizontal,
									childStyles: child.styles,
									blockName: child.name,
									shrink: child.settings?.stackShrink === true,
								}),
								...getBlockSiblingFlexItemStyles(child.styles, stackDirection),
							}}
						>
							<ChildComponent {...child} />
						</div>
					);
				})}
			</div>
			<FormHiddenFields formId={block.id} />
		</form>
	);
}

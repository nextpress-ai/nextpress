/** The id a field's control gets, so its label can point at it on every surface. */
export const formFieldControlId = (blockId: string): string => `np-field-${blockId}`;

/**
 * Visible label above a form field (editor, preview and published pages). Nothing is drawn when
 * the field has no label; the control then keeps its aria-label.
 */
export function FormFieldLabel({
	label,
	htmlFor,
	required,
}: {
	label: string | undefined;
	htmlFor: string;
	required?: boolean;
}) {
	const text = label?.trim();
	if (!text) return null;
	return (
		<label className="wp-block-field__label" htmlFor={htmlFor}>
			{text}
			{required ? (
				<span className="wp-block-field__required" aria-hidden="true">
					{" "}
					*
				</span>
			) : null}
		</label>
	);
}

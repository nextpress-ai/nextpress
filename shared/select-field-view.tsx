import type { CSSProperties, HTMLAttributes } from "react";
import { FormFieldLabel, formFieldControlId } from "./form-field-label.js";
import type { SelectOption } from "./form-field-model.js";

export const selectListId = (blockId: string): string => `${formFieldControlId(blockId)}-list`;
export const selectLabelId = (blockId: string): string => `${formFieldControlId(blockId)}-label`;
export const selectOptionId = (blockId: string, index: number): string => `${formFieldControlId(blockId)}-opt-${index}`;

type SelectFieldViewProps = {
	blockId: string;
	name: string;
	label?: string;
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
	disabled?: boolean;
	ariaLabel: string;
	options: readonly SelectOption[];
	/** Extra wrapper classes (published pages add the block classes here). */
	className?: string;
	/** Wrapper attributes from the block (anchor, custom attributes). */
	wrapperAttributes?: HTMLAttributes<HTMLDivElement>;
	controlClassName?: string;
	style?: CSSProperties;
	/**
	 * Show the styled dropdown straight away (editor canvas). Published pages leave this off: the
	 * page's select script turns it on, so without scripts the plain dropdown still works.
	 */
	ready?: boolean;
};

const Chevron = () => (
	<svg className="np-select__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
		<path d="m6 9 6 6 6-6" />
	</svg>
);

const Check = () => (
	<svg className="np-select__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
		<path d="M20 6 9 17l-5-5" />
	</svg>
);

/**
 * A dropdown field, same markup in the editor, preview and on published pages. A real `<select>`
 * stays underneath (it carries the value, `required`, and works with scripts off); the styled
 * button and list on top are what visitors use once the select script has started.
 */
export function SelectFieldView({
	blockId,
	name,
	label,
	placeholder,
	defaultValue = "",
	required = false,
	disabled = false,
	ariaLabel,
	options,
	className,
	wrapperAttributes,
	controlClassName,
	style,
	ready = false,
}: SelectFieldViewProps) {
	const chosen = options.find((option) => option.value === defaultValue);
	const labelText = label?.trim();
	return (
		<div
			{...wrapperAttributes}
			className={["np-select", ready ? "is-ready" : "", className].filter(Boolean).join(" ")}
			data-np-select=""
		>
			{labelText ? (
				<span id={selectLabelId(blockId)} className="np-select__label-wrap">
					<FormFieldLabel label={labelText} htmlFor={formFieldControlId(blockId)} required={required} />
				</span>
			) : null}
			<select
				id={formFieldControlId(blockId)}
				name={name}
				defaultValue={defaultValue}
				required={required}
				disabled={disabled}
				aria-label={ariaLabel}
				className={["wp-block-select__control", "np-select__native", controlClassName].filter(Boolean).join(" ")}
				style={style}
			>
				{placeholder ? (
					<option value="" disabled hidden>
						{placeholder}
					</option>
				) : null}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<button
				type="button"
				className="np-select__trigger"
				aria-haspopup="listbox"
				aria-expanded="false"
				aria-controls={selectListId(blockId)}
				{...(labelText ? { "aria-labelledby": `${selectLabelId(blockId)} ${formFieldControlId(blockId)}-value` } : { "aria-label": ariaLabel })}
				disabled={disabled}
				style={style}
			>
				<span id={`${formFieldControlId(blockId)}-value`} className={chosen ? "np-select__value" : "np-select__value is-placeholder"}>
					{chosen?.label ?? placeholder ?? ""}
				</span>
				<Chevron />
			</button>
			<ul id={selectListId(blockId)} className="np-select__list" role="listbox" tabIndex={-1} hidden {...(labelText ? { "aria-labelledby": selectLabelId(blockId) } : { "aria-label": ariaLabel })}>
				{options.map((option, index) => (
					<li
						key={option.value}
						id={selectOptionId(blockId, index)}
						className="np-select__option"
						role="option"
						data-value={option.value}
						aria-selected={option.value === defaultValue ? "true" : "false"}
					>
						<span>{option.label}</span>
						<Check />
					</li>
				))}
			</ul>
		</div>
	);
}

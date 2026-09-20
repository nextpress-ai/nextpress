import { UnitValueField } from "./unit-value-field";

interface FreeformSpacingSideRowProps {
	label: string;
	value: string;
	hoverArea: "padding" | "margin";
	onHoverArea?: (area: "padding" | "margin" | null) => void;
	/** `null` clears the side (removes key from styles). */
	onCommit: (fullValue: string | null) => void;
}

/**
 * One padding or margin side: a number and a unit (`16` + `px`), or a value typed whole
 * (`2rem`, `auto`, `calc(…)`). Uses the same group as every other custom length.
 */
export function FreeformSpacingSideRow({
	label,
	value,
	hoverArea,
	onHoverArea,
	onCommit,
}: FreeformSpacingSideRowProps) {
	return (
		<div
			className="w-full"
			onMouseEnter={() => onHoverArea?.(hoverArea)}
			onMouseLeave={() => onHoverArea?.(null)}
		>
			<UnitValueField
				label={label}
				ariaLabel={`${hoverArea} ${label.toLowerCase()}`}
				segmentLabel={null}
				keywords={["auto"]}
				value={value}
				onChange={(next) => onCommit(next ?? null)}
			/>
		</div>
	);
}

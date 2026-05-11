import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FreeformSpacingSideRowProps {
	label: string;
	value: string;
	hoverArea: "padding" | "margin";
	onHoverArea?: (area: "padding" | "margin" | null) => void;
	/** `null` clears the side (removes key from styles). */
	onCommit: (fullValue: string | null) => void;
}

/**
 * One padding or margin side as freeform CSS text (e.g. `16px`, `120 px`, `2rem`, `auto`, `calc(…)`).
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
			className="w-full space-y-1.5"
			onMouseEnter={() => onHoverArea?.(hoverArea)}
			onMouseLeave={() => onHoverArea?.(null)}
		>
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Input
				value={value}
				placeholder="16px, 120 px, 100 rem, auto…"
				spellCheck={false}
				autoComplete="off"
				className="h-9 w-full text-sm"
				onChange={(e) => {
					const raw = e.target.value;
					onCommit(raw.trim() === "" ? null : raw);
				}}
			/>
		</div>
	);
}

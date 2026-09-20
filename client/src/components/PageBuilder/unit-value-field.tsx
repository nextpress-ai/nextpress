import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	SIZE_UNITS,
	composeUnitValue,
	isPartialNumber,
	isUnitInProgress,
	parseUnitValue,
} from "@shared/unit-value";
import { SettingsLabel } from "./shared";

const RAW_ITEM = "__raw__";

type UnitValueFieldProps = {
	id?: string;
	/** Small label above the group. Leave out when a heading above already names the field. */
	label?: string;
	value: string | undefined;
	/** `undefined` means "cleared". */
	onChange: (value: string | undefined) => void;
	/** Units in the dropdown. Pass `[]` for a plain number or free text (no dropdown). */
	units?: readonly string[];
	/** Words allowed instead of a number, shown at the end of the dropdown (e.g. `auto`). */
	keywords?: readonly string[];
	placeholder?: string;
	/** Text on the first segment. `null` leaves the segment out. */
	segmentLabel?: string | null;
	/** Lights the first segment: the value is a custom one, not a preset. */
	active?: boolean;
	/** Base name for screen readers; the number box and the unit dropdown build on it. */
	ariaLabel?: string;
	className?: string;
};

/**
 * One control for every custom length: `[ Custom | value | unit ▾ ]`, joined like a button group.
 * Type a number and pick a unit, or type the whole thing (`24px`, `calc(100% - 2rem)`). A value the
 * field cannot split is shown exactly as saved and never rewritten.
 */
export function UnitValueField({
	id,
	label,
	value,
	onChange,
	units = SIZE_UNITS,
	keywords = [],
	placeholder,
	segmentLabel = "Custom",
	active = false,
	ariaLabel,
	className,
}: UnitValueFieldProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	// The last unit shown, so clearing the number and typing again keeps `rem` instead of snapping to `px`.
	const lastUnit = useRef<string>(units[0] ?? "");
	const [, refresh] = useState(0);
	// What is being typed. Kept apart from the saved value so a half-typed number is never rewritten.
	const [draft, setDraft] = useState<string | null>(null);

	const freeText = units.length === 0;
	const parsed = parseUnitValue({ value, units, keywords });
	if (parsed.kind === "amount" && parsed.unit) lastUnit.current = parsed.unit;
	const unit = lastUnit.current;
	const savedText =
		parsed.kind === "amount" ? parsed.amount : parsed.kind === "raw" ? parsed.raw : freeText && value ? value : "";
	const shownText = draft ?? savedText;
	const name = ariaLabel ?? label ?? "Value";

	const handleText = (text: string) => {
		setDraft(text);
		const trimmed = text.trim();
		if (trimmed === "") {
			onChange(undefined);
			return;
		}
		if (freeText) {
			onChange(trimmed);
			return;
		}
		if (isPartialNumber(trimmed)) {
			const next = composeUnitValue({ amount: trimmed, unit });
			if (next !== undefined) onChange(next);
			return;
		}
		if (isUnitInProgress({ text: trimmed, units, keywords })) return;
		const typed = parseUnitValue({ value: trimmed, units, keywords });
		if (typed.kind === "amount") {
			if (typed.unit) lastUnit.current = typed.unit;
			onChange(composeUnitValue({ amount: typed.amount, unit: typed.unit || unit }));
			return;
		}
		onChange(typed.kind === "keyword" ? typed.keyword : trimmed);
	};

	const handleUnit = (next: string) => {
		if (keywords.includes(next)) {
			onChange(next);
			return;
		}
		lastUnit.current = next;
		refresh((count) => count + 1);
		const amount = parsed.kind === "amount" ? parsed.amount : "";
		const composed = composeUnitValue({ amount, unit: next });
		if (composed !== undefined) onChange(composed);
		else if (parsed.kind === "keyword") onChange(undefined);
	};

	const focusInput = () => {
		inputRef.current?.focus();
		inputRef.current?.select();
	};

	const selectValue = parsed.kind === "keyword" ? parsed.keyword : parsed.kind === "raw" ? RAW_ITEM : unit;
	const hasSegment = segmentLabel !== null;

	return (
		<div className={cn("space-y-1.5", className)}>
			{label ? <SettingsLabel htmlFor={id}>{label}</SettingsLabel> : null}
			<div className="flex items-stretch" role="group" aria-label={name}>
				{hasSegment ? (
					<button
						type="button"
						aria-pressed={active}
						onClick={focusInput}
						className={cn(
							"npb-settings-chip flex shrink-0 items-center justify-center px-3 focus:outline-none",
							active && "npb-settings-chip--active",
						)}
					>
						{segmentLabel}
					</button>
				) : null}
				<Input
					ref={inputRef}
					id={id}
					value={shownText}
					onChange={(event) => handleText(event.target.value)}
					onBlur={() => setDraft(null)}
					disabled={parsed.kind === "keyword"}
					placeholder={parsed.kind === "keyword" ? "" : placeholder ?? (freeText ? "Value" : "0")}
					inputMode={freeText ? "text" : "decimal"}
					spellCheck={false}
					autoComplete="off"
					aria-label={`${name} custom value`}
					className={cn(
						"relative h-9 min-w-0 flex-1 rounded-none text-sm focus-visible:z-10 focus-visible:outline-none",
						hasSegment && "-ml-px",
					)}
				/>
				{freeText ? null : (
					<Select value={selectValue} onValueChange={handleUnit} disabled={parsed.kind === "raw"}>
						<SelectTrigger
							aria-label={`${name} unit`}
							className="npb-settings-select-trigger relative -ml-px h-9 w-[4.75rem] shrink-0 rounded-none px-2 focus-visible:z-10"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{units.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
							{keywords.length > 0 ? <SelectSeparator /> : null}
							{keywords.map((word) => (
								<SelectItem key={word} value={word}>
									{word}
								</SelectItem>
							))}
							<SelectItem value={RAW_ITEM} className="hidden">
								—
							</SelectItem>
						</SelectContent>
					</Select>
				)}
			</div>
		</div>
	);
}

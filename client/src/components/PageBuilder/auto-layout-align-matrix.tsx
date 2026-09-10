import type { KeyboardEvent } from "react";
import {
	AUTO_LAYOUT_ALIGN_POINTS,
	alignPointToFlexStyles,
	type AutoLayoutAlignPoint,
} from "@shared/auto-layout-model";
import { cn } from "@/lib/utils";

type AlignMatrixProps = {
	value: AutoLayoutAlignPoint;
	onChange: (point: AutoLayoutAlignPoint) => void;
	stackIsRow: boolean;
};

/**
 * 9-point alignment pad (same idea as Cover content position). Writes justify + align
 * through `alignPointToFlexStyles` so column vs row stacks map axes correctly.
 */
export function AutoLayoutAlignMatrix({ value, onChange, stackIsRow }: AlignMatrixProps) {
	const indexFor = (point: AutoLayoutAlignPoint) =>
		Math.max(
			0,
			AUTO_LAYOUT_ALIGN_POINTS.findIndex((item) => item.value === point),
		);

	const moveSelection = (deltaRow: number, deltaCol: number) => {
		const index = indexFor(value);
		const row = Math.floor(index / 3);
		const col = index % 3;
		const nextRow = Math.min(2, Math.max(0, row + deltaRow));
		const nextCol = Math.min(2, Math.max(0, col + deltaCol));
		const next = AUTO_LAYOUT_ALIGN_POINTS[nextRow * 3 + nextCol];
		if (next) onChange(next.value);
	};

	const onGroupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			moveSelection(0, 1);
			return;
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			moveSelection(0, -1);
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			moveSelection(1, 0);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			moveSelection(-1, 0);
		}
	};

	return (
		<div
			role="radiogroup"
			aria-label="Align"
			className="npb-align-matrix grid w-fit grid-cols-3"
			onKeyDown={onGroupKeyDown}
		>
			{AUTO_LAYOUT_ALIGN_POINTS.map((point) => {
				const selected = value === point.value;
				return (
					<button
						key={point.value}
						type="button"
						role="radio"
						aria-checked={selected}
						aria-pressed={selected}
						aria-label={point.label}
						title={point.label}
						onClick={() => onChange(point.value)}
						className={cn(
							"npb-settings-chip npb-align-matrix-cell flex items-center justify-center focus:outline-none",
							selected && "npb-settings-chip--active npb-align-matrix-cell--selected",
						)}
					>
						<span
							className={cn(
								"npb-align-matrix-dot block",
								selected ? "bg-current" : "bg-npb-text-muted/50",
							)}
							aria-hidden
						/>
					</button>
				);
			})}
			<span className="sr-only">
				{stackIsRow ? "Horizontal stack" : "Vertical stack"}
			</span>
		</div>
	);
}

export { alignPointToFlexStyles };

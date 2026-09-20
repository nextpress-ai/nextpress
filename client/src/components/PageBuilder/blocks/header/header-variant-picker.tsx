import React from "react";
import { cn } from "@/lib/utils";
import {
	HEADER_VARIANT_OPTIONS,
	type HeaderVariant,
} from "@shared/header-model";

const VARIANT_SKETCH: Record<
	HeaderVariant,
	{ nav: "right" | "middle" | "none"; actions: boolean; blocks?: boolean }
> = {
	"links-and-actions": { nav: "right", actions: true },
	"links-only": { nav: "right", actions: false },
	split: { nav: "middle", actions: true },
	"actions-only": { nav: "none", actions: true },
	"brand-and-blocks": { nav: "none", actions: false, blocks: true },
};

function MiniDots({ count }: { count: number }) {
	return (
		<span className="flex items-center gap-0.5" aria-hidden>
			{Array.from({ length: count }, (_, index) => (
				<span
					key={index}
					className="h-0.5 w-2.5 rounded-full bg-current opacity-50"
				/>
			))}
		</span>
	);
}

function MiniPills({ count }: { count: number }) {
	return (
		<span className="flex items-center gap-0.5" aria-hidden>
			{Array.from({ length: count }, (_, index) => (
				<span
					key={index}
					className={cn(
						"h-1.5 rounded-full",
						index === count - 1
							? "w-3 bg-[var(--npb-accent)]"
							: "w-3 border border-current opacity-50",
					)}
				/>
			))}
		</span>
	);
}

/** One sketch per layout — same arrangements the header paints. */
export function HeaderVariantPicker({
	value,
	onChange,
}: {
	value: HeaderVariant;
	onChange: (value: HeaderVariant) => void;
}) {
	return (
		<div className="space-y-2" role="radiogroup" aria-label="Header layout">
			{HEADER_VARIANT_OPTIONS.map((option) => {
				const selected = value === option.value;
				const sketch = VARIANT_SKETCH[option.value];
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={selected}
						aria-label={option.accessibleName}
						onClick={() => onChange(option.value)}
						className={cn(
							"flex h-9 w-full items-center gap-2 rounded-none border px-2 transition-colors",
							selected
								? "border-npb-border-strong bg-npb-interactive-bg-active text-npb-interactive-text-active"
								: "border-npb-border-default bg-npb-surface-base text-npb-text-secondary hover:border-npb-border-strong hover:bg-npb-interactive-bg-hover",
						)}
					>
						<span className="h-1 w-8 shrink-0 rounded-full bg-current opacity-70" />
						{sketch.nav === "middle" ? (
							<span className="flex flex-1 justify-center">
								<MiniDots count={3} />
							</span>
						) : (
							<span className="flex-1" />
						)}
						{sketch.nav === "right" ? <MiniDots count={3} /> : null}
						{sketch.actions ? <MiniPills count={2} /> : null}
						{sketch.blocks ? (
							<span
								className="h-2.5 w-8 rounded-sm border border-dashed border-current opacity-60"
								aria-hidden
							/>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

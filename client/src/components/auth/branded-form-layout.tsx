import type { ReactNode } from "react";

type BrandedFormLayoutProps = {
	children: ReactNode;
};

/**
 * Shared shell for auth and setup — uses public `npb-*` canvas tokens so loading
 * and auth screens match the rest of the product chrome.
 */
export function BrandedFormLayout({ children }: BrandedFormLayoutProps) {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-npb-canvas-bg p-4 sm:p-8">
			<div
				className="pointer-events-none absolute inset-0 overflow-hidden"
				aria-hidden
			>
				<div className="absolute -top-32 left-1/2 h-56 w-[min(90vw,36rem)] -translate-x-1/2 rounded-full bg-npb-accent/10 blur-3xl" />
			</div>
			<div className="relative z-[1] flex w-full max-w-md flex-col items-center gap-5">
				<img
					src="/logo.svg"
					alt="NextPress"
					width={200}
					height={44}
					className="h-10 w-auto select-none drop-shadow-sm"
					decoding="async"
				/>
				{children}
			</div>
		</div>
	);
}

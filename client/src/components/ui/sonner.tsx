import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

/** App-wide Sonner — richColors, top-right, readable durations. */
const Toaster = ({ ...props }: ToasterProps) => (
	<Sonner
		theme="system"
		richColors
		closeButton
		position="top-right"
		duration={6000}
		{...props}
	/>
);

export { Toaster };

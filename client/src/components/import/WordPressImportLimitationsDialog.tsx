import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

type LimitationSection = {
	title: string;
	items: string[];
};

const SUPPORTED_NOW: LimitationSection = {
	title: "Supported today",
	items: [
		"Published posts and pages via the public WordPress REST API",
		"Title, slug, status, excerpt, featured image, and body content",
		"Classic editor and Gutenberg HTML mapped to editable NextPress blocks where possible",
		"Featured images as external references or copied into your media library",
		"Re-import updates content already brought in from the same WordPress site",
		"Multi-site: pages go to the selected site; posts go to a blog on your active site",
	],
};

const LIMITATIONS: LimitationSection = {
	title: "Current limitations",
	items: [
		"Published content only — drafts and private items are not listed",
		"Up to 50 items per import batch",
		"Media library, comments, users, menus, and site settings are not imported",
		"Page builders (Elementor, Divi, etc.) import as HTML blocks — layout is usually not rebuilt",
		"Sites that block or require auth for /wp-json cannot be discovered",
		"Some complex Gutenberg or custom blocks may fall back to a single HTML block",
	],
};

const COMING_SOON: LimitationSection = {
	title: "Planned improvements",
	items: [
		"Better page-builder and layout mapping",
		"Draft and private content import",
		"Media library and taxonomy bulk import",
		"Higher batch limits and background jobs for large sites",
	],
};

const LimitationList = ({ section }: { section: LimitationSection }) => (
	<div className="space-y-2">
		<h3 className="text-sm font-semibold text-npb-text-primary">{section.title}</h3>
		<ul className="list-disc space-y-1.5 pl-5 text-sm text-npb-text-secondary">
			{section.items.map((item) => (
				<li key={item}>{item}</li>
			))}
		</ul>
	</div>
);

type WordPressImportLimitationsDialogProps = {
	/** Smaller trigger for compact dialog layouts */
	compact?: boolean;
};

/**
 * Explains WordPress import scope and known gaps so users know what to expect.
 */
export function WordPressImportLimitationsDialog({
	compact = false,
}: WordPressImportLimitationsDialogProps) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size={compact ? "sm" : "default"}>
					<Info className="mr-2 h-4 w-4" />
					Limitations
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>WordPress import — what to expect</DialogTitle>
					<DialogDescription>
						Import is experimental. It works well for standard posts and Gutenberg content;
						visual page builders and advanced WP features are still catching up.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-5 pt-2">
					<LimitationList section={SUPPORTED_NOW} />
					<LimitationList section={LIMITATIONS} />
					<LimitationList section={COMING_SOON} />
					<p className="text-xs text-muted-foreground border-t pt-4">
						We are actively improving import fidelity in upcoming releases. If something
						fails, check Limitations above — then retry after a fix or import in smaller
						batches.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

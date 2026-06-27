import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WordPressImportFlow } from "./WordPressImportFlow";
import { WordPressExperimentalBadge } from "./WordPressExperimentalBadge";

export type WordPressImportDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Compact WordPress import from the Posts list. */
export function WordPressImportDialog({ open, onOpenChange }: WordPressImportDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Import from WordPress
						<WordPressExperimentalBadge />
					</DialogTitle>
					<DialogDescription>
						Connect to a WordPress site and import published posts or pages.
					</DialogDescription>
				</DialogHeader>
				<WordPressImportFlow
					compact
					onComplete={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

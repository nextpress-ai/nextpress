import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ContentKind = "page" | "post";

const labels: Record<ContentKind, { one: string; many: string }> = {
	page: { one: "page", many: "pages" },
	post: { one: "post", many: "posts" },
};

type ConfirmBulkDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	count: number;
	contentKind: ContentKind;
	onConfirm: () => void;
	isPending?: boolean;
};

/** Confirms permanent delete for one or many pages or posts. */
export function ConfirmBulkDeleteDialog({
	open,
	onOpenChange,
	count,
	contentKind,
	onConfirm,
	isPending = false,
}: ConfirmBulkDeleteDialogProps) {
	const copy = labels[contentKind];
	const noun = count === 1 ? copy.one : copy.many;
	const title = count === 1 ? `Delete this ${copy.one}?` : `Delete ${count} ${copy.many}?`;
	const description =
		count === 1
			? `This ${copy.one} will be removed permanently. You cannot undo this.`
			: `These ${copy.many} will be removed permanently. You cannot undo this.`;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
						disabled={isPending}
						className="bg-red-600 hover:bg-red-700"
					>
						{isPending ? "Deleting..." : `Delete ${count === 1 ? noun : `${count} ${noun}`}`}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

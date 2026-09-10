import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { readPostOverlaySlug } from "@shared/bind-post-list";

type PublicPostDetail = {
	title?: string;
	excerpt?: string;
	featuredImage?: string;
	renderedHtml?: string;
};

function subscribeHash(onStoreChange: () => void): () => void {
	window.addEventListener("hashchange", onStoreChange);
	return () => window.removeEventListener("hashchange", onStoreChange);
}

function readHash(): string {
	return window.location.hash;
}

function readHashOnServer(): string {
	return "";
}

function closeOverlayHash(): void {
	if (!readPostOverlaySlug(window.location.hash)) return;
	const url = `${window.location.pathname}${window.location.search}`;
	window.history.replaceState(null, "", url);
	window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function openOverlayHash(slug: string): void {
	const next = `#post/${encodeURIComponent(slug)}`;
	if (window.location.hash === next) return;
	window.location.hash = `post/${encodeURIComponent(slug)}`;
}

/**
 * Visitor post details overlay. Hash `#post/{slug}` is the source of truth
 * so back/close restores the grid without a second page.
 * Portals to document.body, so colors are set on the sheet itself — not
 * inherited from admin dark theme or `.np-visitor-document`.
 */
export function PostListOverlay({ enabled }: { enabled: boolean }) {
	const hash = useSyncExternalStore(subscribeHash, readHash, readHashOnServer);
	const slug = enabled ? readPostOverlaySlug(hash) : "";
	const open = Boolean(slug);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["public-post-overlay", slug],
		queryFn: async () => {
			const res = await fetch(`/api/public/post/${encodeURIComponent(slug)}`);
			if (!res.ok) throw new Error("Post not found");
			return (await res.json()) as PublicPostDetail;
		},
		enabled: open,
		staleTime: 5 * 60 * 1000,
	});

	const title = data?.title || (isLoading ? "Loading" : "Post");

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) closeOverlayHash();
			}}
		>
			<DialogContent
				aria-describedby={undefined}
				className="np-post-overlay left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border border-zinc-200 bg-[#fafafa] p-0 text-zinc-900 shadow-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:min-h-[16rem] sm:w-[min(44rem,calc(100vw-2rem))] sm:max-w-[44rem] sm:translate-x-[-50%] sm:translate-y-[-50%]"
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<DialogDescription className="sr-only">Post details</DialogDescription>
				<div className="np-post-overlay__article overflow-y-auto">
					{isLoading ? (
						<p className="np-post-overlay__status">Loading post…</p>
					) : null}
					{isError ? (
						<p className="np-post-overlay__status np-post-overlay__status--error">
							Could not load this post.{" "}
							<a href={`/post/${slug}`}>Open full post</a>
						</p>
					) : null}
					{data?.featuredImage ? (
						<img
							src={data.featuredImage}
							alt=""
							className="np-post-overlay__image"
						/>
					) : null}
					{data?.title ? (
						<h2 className="np-post-overlay__title">{data.title}</h2>
					) : null}
					{data?.renderedHtml ? (
						<div
							className="np-post-overlay__html"
							dangerouslySetInnerHTML={{ __html: data.renderedHtml }}
						/>
					) : data && !isLoading && !isError ? (
						<p className="np-post-overlay__status">
							<a href={`/post/${slug}`}>Open full post</a>
						</p>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export { closeOverlayHash, openOverlayHash };

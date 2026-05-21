function findBlockPreviewElement(blockId: string): HTMLElement | null {
	return document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`) as HTMLElement | null;
}

/** Plays an Animate.css preview on a canvas block wrapper. */
export function playAnimateCssPreview({
	blockId,
	animName,
	infinite = false,
	durationMs,
	delayMs,
}: {
	blockId: string;
	animName: string;
	infinite?: boolean;
	durationMs?: number;
	delayMs?: number;
}): void {
	const el = findBlockPreviewElement(blockId);
	if (!el) return;

	el.classList.remove("animate__animated", "animate__infinite");
	for (const cls of Array.from(el.classList)) {
		if (cls.startsWith("animate__") && cls !== "animate__animated" && cls !== "animate__infinite") {
			el.classList.remove(cls);
		}
	}
	el.getAnimations().forEach((animation) => animation.cancel());

	if (durationMs !== undefined) {
		el.style.setProperty("--animate-duration", `${durationMs}ms`);
	}
	el.style.animationDelay = delayMs && delayMs > 0 ? `${delayMs}ms` : "";

	void el.offsetWidth;

	el.classList.add("animate__animated", `animate__${animName}`);
	if (infinite) {
		el.classList.add("animate__infinite");
	}

	if (!infinite) {
		const cleanup = () => {
			el.classList.remove("animate__animated", `animate__${animName}`);
			el.removeEventListener("animationend", cleanup);
		};
		el.addEventListener("animationend", cleanup, { once: true });
	}
}

/** Runs preview after React commits className updates from block state changes. */
export function scheduleAnimateCssPreview(params: {
	blockId: string;
	animName: string;
	infinite?: boolean;
	durationMs?: number;
	delayMs?: number;
}): void {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			playAnimateCssPreview(params);
		});
	});
}

/** Clears Animate.css preview classes from a canvas block. */
export function clearAnimateCssPreview(blockId: string): void {
	const el = findBlockPreviewElement(blockId);
	if (!el) return;

	for (const cls of Array.from(el.classList)) {
		if (cls.startsWith("animate__")) {
			el.classList.remove(cls);
		}
	}
	el.getAnimations().forEach((animation) => animation.cancel());
}

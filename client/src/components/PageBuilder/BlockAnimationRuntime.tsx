import { useEffect } from "react";
import { initEntryAnimations } from "@/lib/entry-animation-controller";
import { getEntryAnimationBaseCSS } from "@shared/animation-utils";
import "@/lib/animate.min.css";

function useMountEffect(effect: () => void | (() => void)) {
	/* eslint-disable react-hooks/exhaustive-deps, no-restricted-syntax */
	useEffect(effect, []);
}

type BlockAnimationRuntimeProps = {
	/** Changes when page content identity changes — remount to re-init animations. */
	contentKey: string;
};

/**
 * Loads Animate.css and starts scroll entry animations after the page is ready.
 * Mount alongside published/preview block trees (not the editor canvas).
 */
export function BlockAnimationRuntime({ contentKey }: BlockAnimationRuntimeProps) {
	useMountEffect(() => {
		initEntryAnimations();
	});

	void contentKey;

	return <style dangerouslySetInnerHTML={{ __html: getEntryAnimationBaseCSS() }} />;
}

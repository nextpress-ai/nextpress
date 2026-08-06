import { PUBLISH_BLOCK_CSS } from "@shared/publish-block-css";

/** Injects shared responsive publish CSS once per page (preview + public SPA). */
export function PublishBlockStyles(): JSX.Element {
	return <style dangerouslySetInnerHTML={{ __html: PUBLISH_BLOCK_CSS }} />;
}

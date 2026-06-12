import type { BlockConfig } from "@shared/schema-types";

/** In-memory clipboard for block copy/paste within the page builder session. */
let clipboardBlock: BlockConfig | null = null;

export function copyBlockToClipboard({ block }: { block: BlockConfig }): void {
  clipboardBlock = structuredClone(block);
}

export function readBlockFromClipboard(): BlockConfig | null {
  return clipboardBlock;
}

export function clearBlockClipboard(): void {
  clipboardBlock = null;
}

export function hasBlockInClipboard(): boolean {
  return clipboardBlock !== null;
}

import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { BlockConfig } from '@shared/schema-types';
import { PAGE_SHELL_BLOCK_NAME } from '@shared/page-shell-model';
import { countPageBlocks, placePastedBlocks, type PagePackage, type PasteAllMode } from '@shared/page-transfer';
import {
  copyBlocksToSystemClipboard,
  landPastedPackage,
  readBlocksFromSystemClipboard,
  readBlocksFromText,
  type ClipboardRead,
} from '@/lib/page-transfer/blocks-clipboard';
import { describeMissingFiles } from '@/lib/page-transfer/page-transfer-api';
import { showErrorToast, showSuccessToast } from '@/lib/sonner-toast';
import { PasteBlocksDialog } from '@/components/PageTransfer/PasteBlocksDialog';
import { ExportPageDialog } from '@/components/PageTransfer/ExportPageDialog';

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const reportPasted = ({ count, missing }: { count: number; missing: Parameters<typeof describeMissingFiles>[0] }) => {
  const note = describeMissingFiles(missing);
  if (note) showErrorToast(`Pasted ${plural(count, 'block')}. ${note}`);
  else showSuccessToast(`Pasted ${plural(count, 'block')}`);
};

/**
 * Copy, paste and export for moving blocks between NextPress sites.
 * Copies go to the system clipboard (with small images inside), so they paste on another site
 * too; the builder's own copy stays as the fallback when the browser keeps the clipboard closed.
 */
export function usePageTransfer({
  blocks,
  commitBlocks,
  insertBlockAtSelection,
  pasteFromBuilderCopy,
  canPasteHere,
  generateId,
  page,
}: {
  blocks: BlockConfig[];
  commitBlocks: (next: (prev: BlockConfig[]) => BlockConfig[]) => void;
  /** Puts one block after the selected one (or at the end) with fresh ids. */
  insertBlockAtSelection: (block: BlockConfig) => void;
  /** The builder's in-memory paste, used when the clipboard holds no NextPress blocks. */
  pasteFromBuilderCopy: () => void;
  /** A paste keystroke only acts on the canvas: a block is selected and not being typed in. */
  canPasteHere: () => boolean;
  generateId: () => string;
  /** Present for saved pages; templates and posts cannot be exported as a page. */
  page: { id: string; title: string } | null;
}): {
  copyBlock: (block: BlockConfig) => Promise<void>;
  copyAllBlocks: () => Promise<void>;
  paste: () => Promise<void>;
  openExport: (() => void) | undefined;
  dialogs: JSX.Element;
} {
  const [pending, setPending] = useState<PagePackage | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const copy = useCallback(async ({ items, done }: { items: BlockConfig[]; done: string }) => {
    const result = await copyBlocksToSystemClipboard({ blocks: items });
    if (!result.copied) {
      showErrorToast(result.reason);
      return;
    }
    if (result.leftOut.length === 0) {
      showSuccessToast(done);
      return;
    }
    showSuccessToast(
      `${done}. ${plural(result.leftOut.length, 'file')} will paste as a placeholder (${result.leftOut
        .slice(0, 2)
        .join(', ')}${result.leftOut.length > 2 ? '…' : ''}). Use Export page to bring every file.`,
    );
  }, []);

  const copyBlock = useCallback((block: BlockConfig) => copy({ items: [block], done: 'Block copied' }), [copy]);

  const copyAllBlocks = useCallback(
    () => copy({ items: blocks, done: `Copied ${plural(countPageBlocks(blocks), 'block')}` }),
    [blocks, copy],
  );

  /** Files first (so a failure changes nothing), then the blocks. */
  const land = useCallback(async (pkg: PagePackage): Promise<Awaited<ReturnType<typeof landPastedPackage>> | null> => {
    setIsPasting(true);
    const landed = await landPastedPackage({ pkg }).catch((error: Error) => {
      console.error('[page-transfer] Paste failed while adding files', { atFunction: 'usePageTransfer.land', error });
      showErrorToast(error.message);
      return null;
    });
    setIsPasting(false);
    return landed;
  }, []);

  const pasteAll = useCallback(
    async ({ pkg, mode }: { pkg: PagePackage; mode: PasteAllMode }) => {
      const landed = await land(pkg);
      if (!landed) return;
      commitBlocks((prev) => placePastedBlocks({ current: prev, pasted: landed.blocks, mode, generateId }));
      setPending(null);
      reportPasted({ count: countPageBlocks(landed.blocks), missing: landed.missing });
    },
    [commitBlocks, generateId, land],
  );

  const pastePackage = useCallback(async (pkg: PagePackage) => {
    const [first] = pkg.blocks;
    if (pkg.blocks.length === 1 && first && first.name !== PAGE_SHELL_BLOCK_NAME) {
      const landed = await land(pkg);
      if (!landed?.blocks[0]) return;
      insertBlockAtSelection(landed.blocks[0]);
      reportPasted({ count: countPageBlocks(landed.blocks), missing: landed.missing });
      return;
    }

    if (countPageBlocks(blocks) === 0) {
      await pasteAll({ pkg, mode: 'replace' });
      return;
    }
    setPending(pkg);
  }, [blocks, insertBlockAtSelection, land, pasteAll]);

  const handleRead = useCallback(
    async (read: ClipboardRead) => {
      if (read.kind === 'package') return pastePackage(read.pkg);
      if (read.kind === 'refused') return showErrorToast(read.message);
      if (read.kind === 'blocked') {
        return showErrorToast('The browser kept the clipboard closed. Click a block and press Ctrl+V (Cmd+V on Mac) instead.');
      }
      pasteFromBuilderCopy();
    },
    [pasteFromBuilderCopy, pastePackage],
  );

  /** Menu paste: asks the browser for the clipboard. */
  const paste = useCallback(async () => handleRead(await readBlocksFromSystemClipboard()), [handleRead]);

  // Ctrl+V / Cmd+V: the paste event carries the clipboard, so the browser never has to ask.
  const handleReadRef = useRef(handleRead);
  handleReadRef.current = handleRead;
  const canPasteHereRef = useRef(canPasteHere);
  canPasteHereRef.current = canPasteHere;
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping || !canPasteHereRef.current()) return;
      event.preventDefault();
      void handleReadRef.current(readBlocksFromText(event.clipboardData?.getData('text/plain') ?? ''));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const dialogs = (
    <>
      <PasteBlocksDialog
        open={pending !== null}
        blockCount={pending ? countPageBlocks(pending.blocks) : 0}
        isPasting={isPasting}
        onCancel={() => setPending(null)}
        onPaste={(mode) => pending && void pasteAll({ pkg: pending, mode })}
      />
      <ExportPageDialog page={page} open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );

  return {
    copyBlock,
    copyAllBlocks,
    paste,
    openExport: page ? () => setExportOpen(true) : undefined,
    dialogs,
  };
}

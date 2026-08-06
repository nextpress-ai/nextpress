import { useMemo } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { validateBlockResponsiveHealth } from "@shared/validate-block-responsive-health";
import { Button } from "@/components/ui/button";

type ResponsiveHealthBannerProps = {
  blocks: BlockConfig[];
  onApplyDefaults?: () => void;
};

/**
 * Non-blocking sidebar hint when blocks may overflow on mobile.
 * Warn-only — never prevents save.
 */
export function ResponsiveHealthBanner({
  blocks,
  onApplyDefaults,
}: ResponsiveHealthBannerProps): JSX.Element | null {
  const issues = useMemo(() => validateBlockResponsiveHealth(blocks).issues, [blocks]);

  if (issues.length === 0) {
    return null;
  }

  const preview = issues.slice(0, 3);

  return (
    <div
      className="mx-3 mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
      role="status"
    >
      <p className="font-medium text-amber-50">Mobile layout check</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-100/90">
        {preview.map((issue) => (
          <li key={`${issue.blockId}-${issue.code}`}>{issue.message}</li>
        ))}
      </ul>
      {issues.length > 3 ? (
        <p className="mt-1 text-amber-100/70">{issues.length - 3} more on this page</p>
      ) : null}
      {onApplyDefaults ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-7 border-amber-400/50 bg-transparent text-amber-50 hover:bg-amber-500/20"
          onClick={onApplyDefaults}
        >
          Apply mobile-friendly defaults
        </Button>
      ) : null}
    </div>
  );
}

import type { ReactElement } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BuilderSidebar, type BuilderSidebarProps } from './BuilderSidebar';
import { BuilderLibrarySidebar } from './BuilderLibrarySidebar';

/** First viewport width where library and inspector rails fit on opposite sides. */
export const BUILDER_WIDE_BREAKPOINT = 1280;

/** Match query used to choose wide split layout vs compact tabs. */
export const BUILDER_WIDE_QUERY = `(min-width: ${BUILDER_WIDE_BREAKPOINT}px)`;

/**
 * Wide viewports get a left library rail; narrow viewports keep tabbed sidebar.
 */
export function BuilderResponsiveSidebar(
  props: BuilderSidebarProps,
): ReactElement {
  const isWide = useMediaQuery(BUILDER_WIDE_QUERY);

  if (isWide) {
    return (
      <BuilderLibrarySidebar
        onToggleSidebar={props.onToggleSidebar}
        onInsertTemplate={props.onInsertTemplate}
        blocks={props.blocks}
        onApplyResponsiveDefaults={props.onApplyResponsiveDefaults}
      />
    );
  }

  return <BuilderSidebar {...props} />;
}

/**
 * Whether the builder should use the wide three-column shell (library | canvas | inspector).
 */
export function useBuilderWideLayout(): boolean {
  return useMediaQuery(BUILDER_WIDE_QUERY);
}

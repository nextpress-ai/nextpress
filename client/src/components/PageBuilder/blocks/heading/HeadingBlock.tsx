// blocks/heading/HeadingBlock.tsx
import { Heading1, Type, Settings } from "lucide-react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { OptionButton, OptionGroup, SettingsLabel } from '../../shared';
import * as React from "react";
import type { JSX } from "react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

type HeadingContent = BlockContent & {
  level?: number;
  anchor?: string;
  className?: string;
  textAlign?: "left" | "center" | "right" | "justify";
};

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const DEFAULT_CONTENT: HeadingContent = {
  kind: "text",
  value: "Your heading here",
  level: 2,
  textAlign: "left",
  anchor: "",
  className: "",
};

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** Default font sizes per heading level — Tailwind's CSS reset strips browser defaults */
const HEADING_FONT_SIZES: Record<number, string> = {
  1: "2.5rem",
  2: "2rem",
  3: "1.75rem",
  4: "1.5rem",
  5: "1.25rem",
  6: "1rem",
};

/** Font weights per heading level — heavier for more prominent headings */
const HEADING_FONT_WEIGHTS: Record<number, string> = {
  1: "800",
  2: "700",
  3: "700",
  4: "600",
  5: "600",
  6: "600",
};

const SETTINGS_SECTIONS = {
  content: { title: "Content", icon: Type, defaultOpen: true },
  settings: { title: "Settings", icon: Settings, defaultOpen: true },
} as const;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get text content from heading content safely
 */
function getTextContent(content: HeadingContent): string {
  return content?.kind === "text" ? content.value : "";
}

// ============================================================================
// RENDERER
// ============================================================================

interface HeadingRendererProps {
  content: HeadingContent;
  styles?: React.CSSProperties;
}

function HeadingRenderer({ content, styles }: HeadingRendererProps) {
  const textContent = getTextContent(content);
  const level = content.level || 2;
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const mergedStyles: React.CSSProperties = {
    fontSize: HEADING_FONT_SIZES[level],
    fontWeight: HEADING_FONT_WEIGHTS[level],
    ...styles,
  };

  return (
    <BlockShell
      as={Tag}
      blockClass="wp-block-heading"
      className={[
        content.textAlign ? `has-text-align-${content.textAlign}` : "",
        content.className,
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      style={mergedStyles}
      id={content.anchor}
    >
      {textContent}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface HeadingSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function LegacyHeadingSettings({ block, onUpdate }: HeadingSettingsProps) {
  const { accessor, content, updateContent } = useSettingsState<HeadingContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  // Derived data
  const textValue = content?.kind === "text" ? content.value : "";
  const currentLevel = content?.level || 2;
  // Render
  return (
    <div className="space-y-4">
      {/* Content Section */}
      <CollapsibleCard
        title={SETTINGS_SECTIONS.content.title}
        icon={SETTINGS_SECTIONS.content.icon}
        defaultOpen={SETTINGS_SECTIONS.content.defaultOpen}
      >
        <div>
          <SettingsLabel htmlFor="heading-text">Heading Text</SettingsLabel>
          <Input
            id="heading-text"
            aria-label="Heading text"
            value={textValue}
            onChange={(e) =>
              updateContent({ kind: "text", value: e.target.value })
            }
            placeholder="Enter heading text"
            className="mt-1 h-9"
          />
        </div>
      </CollapsibleCard>

      {/* Level Section */}
      <CollapsibleCard
        title={SETTINGS_SECTIONS.settings.title}
        icon={SETTINGS_SECTIONS.settings.icon}
        defaultOpen={SETTINGS_SECTIONS.settings.defaultOpen}
      >
        <OptionGroup label="Heading Level">
          {HEADING_LEVELS.map((level) => (
            <OptionButton
              key={level}
              isActive={currentLevel === level}
              onClick={() => {
                updateContent({ level });
                if (!accessor) {
                  onUpdate?.({
                    styles: {
                      ...block.styles,
                      fontSize: HEADING_FONT_SIZES[level],
                      fontWeight: HEADING_FONT_WEIGHTS[level],
                    },
                  });
                }
              }}
              ariaLabel={`Heading level ${level}`}
            >
              H{level}
            </OptionButton>
          ))}
        </OptionGroup>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

export const HeadingBlock = createBlockDefinition<HeadingContent>({
  id: "core/heading",
  label: "Heading",
  icon: Heading1,
  description: "Add a heading text",
  category: "basic",
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    fontWeight: "700",
    margin: "1rem 0",
  },
  settings: LegacyHeadingSettings,
  hasSettings: true,
  render: ({ content, styles }) => <HeadingRenderer content={content} styles={styles} />,
});

export default HeadingBlock;

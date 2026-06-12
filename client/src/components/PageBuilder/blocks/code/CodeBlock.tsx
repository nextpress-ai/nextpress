import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Code as CodeIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

type CodeContent = {
  content?: string;
  language?: string;
  className?: string;
};

const DEFAULT_CONTENT: CodeContent = {
  content: '// Write your code here\nfunction hello() {\n  console.log("Hello, World!");\n}',
  language: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface CodeRendererProps {
  content: CodeContent;
  styles?: React.CSSProperties;
}

function CodeRenderer({ content, styles }: CodeRendererProps) {
  const codeContent = content?.content || '';
  const language = content?.language || '';
  
  return (
    <BlockShell
      blockClass="wp-block-code"
      className={[language ? `language-${language}` : '', content?.className || ''].filter(Boolean).join(' ') || undefined}
      style={styles}
    >
      <pre style={{
        backgroundColor: '#f8f9fa',
        padding: '1em',
        borderRadius: '4px',
        border: '1px solid #e9ecef',
        overflow: 'auto',
        fontFamily: 'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        margin: 0,
      }}>
        <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{codeContent}</code>
      </pre>
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface CodeSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function CodeSettings({ block, onUpdate }: CodeSettingsProps) {
  const { content, updateContent } = useSettingsState<CodeContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={CodeIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="code-content">Code</SettingsLabel>
            <Textarea
              id="code-content"
              value={content?.content || ''}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="Enter your code here..."
              rows={8}
              className="mt-1"
              style={{
                fontFamily: 'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="code-language">Language (optional)</SettingsLabel>
            <Input
              id="code-language"
              value={content?.language || ''}
              onChange={(e) => updateContent({ language: e.target.value })}
              placeholder="e.g. javascript, python, html"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const CodeBlock = createBlockDefinition<CodeContent>({
  id: 'core/code',
  label: 'Code',
  icon: CodeIcon,
  description: 'Display code with syntax highlighting',
  category: 'advanced',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    margin: '1em 0',
  },
  settings: CodeSettings,
  hasSettings: true,
  render: ({ content, styles }) => <CodeRenderer content={content} styles={styles} />,
});

export default CodeBlock;

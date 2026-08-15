import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from "../../shared";
import { Code as CodeIcon, Settings, Sparkles, Copy as CopyIcon, Check } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

export type CodeContent = {
  content?: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  wrapLines?: boolean;
  showCopyButton?: boolean;
};

const DEFAULT_CONTENT: CodeContent = {
  content: '// Write your code here\nfunction hello() {\n  console.log("Hello, World!");\n}',
  language: "javascript",
  className: "",
  showLineNumbers: false,
  wrapLines: true,
  showCopyButton: false,
};

const POPULAR_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash / Shell" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "java", label: "Java" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain text" },
];

// ============================================================================
// RENDERER & IN-CANVAS EDITOR
// ============================================================================

interface CodeRendererProps {
  content: CodeContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  onUpdateContent?: (updates: Partial<CodeContent>) => void;
}

function CodeRenderer({
  content,
  styles,
  isEditing,
  onUpdateContent,
}: CodeRendererProps) {
  const codeContent = content?.content ?? "";
  const language = content?.language || "";
  const showLineNumbers = Boolean(content?.showLineNumbers);
  const wrapLines = content?.wrapLines !== false;
  const showCopyButton = Boolean(content?.showCopyButton);
  const [copied, setCopied] = React.useState(false);

  const lines = codeContent.split("\n");

  const handleCopy = () => {
    navigator.clipboard?.writeText(codeContent).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => undefined);
  };

  const preStyle: React.CSSProperties = {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    padding: "1rem",
    borderRadius: "6px",
    overflowX: "auto",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "0.875rem",
    lineHeight: "1.6",
    ...styles,
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const nextVal = val.substring(0, start) + "  " + val.substring(end);
      onUpdateContent?.({ content: nextVal });
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <BlockShell
      blockClass="wp-block-code"
      className={[
        language ? `language-${language}` : "",
        showLineNumbers ? "has-line-numbers" : "",
        content?.className || "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      style={styles}
    >
      <div style={preStyle} className="relative group">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs text-slate-400">
          <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-slate-300">
            {language || "code"}
          </span>
          <div className="flex items-center gap-2">
            {showCopyButton && !isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy code"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <CopyIcon className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <span className="text-[11px] text-slate-400">
              {lines.length} {lines.length === 1 ? "line" : "lines"} · {codeContent.length} chars
            </span>
          </div>
        </div>

        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              value={codeContent}
              onChange={(e) => onUpdateContent?.({ content: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Paste or write your code here..."
              rows={Math.max(4, Math.min(20, lines.length + 1))}
              className="w-full bg-slate-900/90 text-slate-100 p-2 rounded font-mono text-xs leading-relaxed border border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              style={{
                tabSize: 2,
                whiteSpace: wrapLines ? "pre-wrap" : "pre",
              }}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">Tab</kbd> to indent with 2 spaces. Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">Esc</kbd> when finished.
            </p>
          </div>
        ) : (
          <code
            style={{
              display: "block",
              whiteSpace: wrapLines ? "pre-wrap" : "pre",
              wordBreak: wrapLines ? "break-word" : "normal",
            }}
          >
            {showLineNumbers
              ? lines.map((line, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-slate-500 select-none text-right min-w-[1.5rem]">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{line || " "}</span>
                  </div>
                ))
              : codeContent || "// Empty code block"}
          </code>
        )}
      </div>
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

  const language = content?.language || "javascript";

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Code Editor" icon={CodeIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="code-language">Language</SettingsLabel>
            <Select
              value={language}
              onValueChange={(val) => updateContent({ language: val })}
            >
              <SelectTrigger id="code-language" className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="code-content-field">Code Snippet</SettingsLabel>
            <Textarea
              id="code-content-field"
              value={content?.content || ""}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="Enter your code here..."
              rows={8}
              className="mt-1 text-xs font-mono"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Display Settings Card */}
      <CollapsibleCard title="Display Options" icon={Sparkles} defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="code-linenumbers">Show line numbers</SettingsLabel>
            <Switch
              id="code-linenumbers"
              checked={Boolean(content?.showLineNumbers)}
              onCheckedChange={(checked) =>
                updateContent({ showLineNumbers: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="code-copybutton">Show copy button</SettingsLabel>
            <Switch
              id="code-copybutton"
              checked={Boolean(content?.showCopyButton)}
              onCheckedChange={(checked) =>
                updateContent({ showCopyButton: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="code-wraplines">Wrap long lines</SettingsLabel>
            <Switch
              id="code-wraplines"
              checked={content?.wrapLines !== false}
              onCheckedChange={(checked) => updateContent({ wrapLines: checked })}
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
  id: "core/code",
  label: "Code",
  icon: CodeIcon,
  description: "Display code with language tagging and line numbers",
  category: "advanced",
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    margin: "1em 0",
  },
  settings: CodeSettings,
  hasSettings: true,
  render: ({ content, styles, isEditing, setContent }) => (
    <CodeRenderer
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }))}
    />
  ),
});

export default CodeBlock;

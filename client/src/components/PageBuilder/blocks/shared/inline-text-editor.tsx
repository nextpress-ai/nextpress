import React from "react";

/**
 * In-canvas text editor used when a block is in editing mode.
 * Mirrors the surrounding text styling (font, size, weight, color) so the
 * swap from static text to editor is visually seamless. A dashed accent
 * outline marks it as editable without fighting the block's own styles.
 */
interface InlineTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** CSS to mirror the rendered text (font-family, size, weight, color...). */
  style?: React.CSSProperties;
  /** Multi-line textarea vs single-line input. */
  multiline?: boolean;
  placeholder?: string;
  /** Min height for multi-line editors (px). */
  minHeight?: number;
  className?: string;
}

export function InlineTextEditor({
  value,
  onChange,
  style,
  multiline = false,
  placeholder,
  minHeight = 80,
  className,
}: InlineTextEditorProps) {
  const editorStyle: React.CSSProperties = {
    ...style,
    width: "100%",
    background: "transparent",
    border: "1px dashed rgba(59,130,246,0.6)",
    borderRadius: "4px",
    outline: "none",
    margin: 0,
    padding: "4px 6px",
    resize: "none",
    boxSizing: "border-box",
  };

  if (multiline) {
    const lineCount = value.split("\n").length;
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={Math.max(2, Math.min(12, lineCount + 1))}
          style={{ ...editorStyle, minHeight }}
          className={className}
        />
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...editorStyle, minHeight: 28, height: "auto" }}
        className={className}
      />
    </div>
  );
}
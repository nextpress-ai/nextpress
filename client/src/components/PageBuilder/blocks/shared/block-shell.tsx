import React from "react";
import type { JSX } from "react";

type BlockShellProps = {
  /** Base WordPress-style block class, e.g. `wp-block-heading`. */
  blockClass: string;
  /** Optional extra classes from block content (`className`). */
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">;

/**
 * Shared outer wrapper for block renderers — merges `wp-block-*` with content
 * className and applies block-level styles in one place.
 */
export function BlockShell({
  blockClass,
  className,
  style,
  as: Tag = "div",
  children,
  ...rest
}: BlockShellProps): JSX.Element {
  const mergedClass = [blockClass, className].filter(Boolean).join(" ");
  return (
    <Tag className={mergedClass} style={style} {...rest}>
      {children}
    </Tag>
  );
}

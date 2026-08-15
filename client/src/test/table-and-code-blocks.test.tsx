import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { TableBlock, CodeBlock } from "../../../renderer/react/advanced";
import type { BlockConfig } from "@shared/schema-types";

describe("renderer/react/advanced TableBlock", () => {
  it("renders structured table data with headers and body rows properly", () => {
    const block: BlockConfig = {
      id: "table-1",
      name: "core/table",
      type: "block",
      parentId: null,
      content: {
        kind: "structured",
        data: {
          head: [
            {
              cells: [
                { content: "Product", tag: "th" },
                { content: "Price", tag: "th" },
              ],
            },
          ],
          body: [
            {
              cells: [
                { content: "Coffee", tag: "td" },
                { content: "$4.00", tag: "td" },
              ],
            },
            {
              cells: [
                { content: "Tea", tag: "td" },
                { content: "$3.00", tag: "td" },
              ],
            },
          ],
          caption: "Menu Prices",
          striped: true,
        },
      },
    };

    const { container } = render(<TableBlock {...block} />);
    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const headers = container.querySelectorAll("th");
    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toBe("Product");
    expect(headers[1].textContent).toBe("Price");

    const cells = container.querySelectorAll("tbody td");
    expect(cells.length).toBe(4);
    expect(cells[0].textContent).toBe("Coffee");
    expect(cells[1].textContent).toBe("$4.00");

    const caption = container.querySelector("caption");
    expect(caption?.textContent).toBe("Menu Prices");
  });

  it("maintains backward compatibility with legacy headers and rows arrays", () => {
    const block: BlockConfig = {
      id: "table-legacy",
      name: "core/table",
      type: "block",
      parentId: null,
      content: {
        kind: "structured",
        data: {
          headers: ["Col 1", "Col 2"],
          rows: [
            ["A1", "A2"],
            ["B1", "B2"],
          ],
        },
      },
    };

    const { container } = render(<TableBlock {...block} />);
    const ths = container.querySelectorAll("th");
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toBe("Col 1");

    const tds = container.querySelectorAll("tbody td");
    expect(tds.length).toBe(4);
    expect(tds[0].textContent).toBe("A1");
  });
});

describe("renderer/react/advanced CodeBlock", () => {
  it("renders code block with language class and formatting", () => {
    const block: BlockConfig = {
      id: "code-1",
      name: "core/code",
      type: "block",
      parentId: null,
      content: {
        kind: "structured",
        data: {
          content: "const a = 1;\nconst b = 2;",
          language: "typescript",
          showLineNumbers: true,
        },
      },
    };

    const { container } = render(<CodeBlock {...block} />);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.className).toContain("language-typescript");
    expect(pre?.className).toContain("has-line-numbers");
    expect(container.textContent).toContain("typescript");
    expect(container.textContent).toContain("const a = 1;");
  });

  it("renders a copy button when showCopyButton is enabled", () => {
    const block: BlockConfig = {
      id: "code-2",
      name: "core/code",
      type: "block",
      parentId: null,
      content: {
        kind: "structured",
        data: {
          content: "const a = 1;",
          language: "javascript",
          showCopyButton: true,
        },
      },
    };

    const { container } = render(<CodeBlock {...block} />);
    const copyBtn = container.querySelector("button");
    expect(copyBtn).not.toBeNull();
    expect(copyBtn?.textContent).toContain("Copy");
  });
});

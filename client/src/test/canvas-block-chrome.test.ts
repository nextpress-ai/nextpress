import { describe, expect, it } from "vitest";
import {
  defaultCanvasChromeMode,
  getCanvasChromeFrameStyle,
  getCanvasChromeInnerStyle,
  getCanvasChromeSlotStyle,
  readCanvasChromeAlign,
} from "../components/PageBuilder/canvas-block-chrome";

describe("readCanvasChromeAlign", () => {
  it("prefers a parent pin over text align", () => {
    expect(
      readCanvasChromeAlign({
        styles: { contentAlignHorizontal: "right", textAlign: "center" },
        content: { textAlign: "left" },
      }),
    ).toBe("right");
  });

  it("falls back to style then content text align", () => {
    expect(
      readCanvasChromeAlign({
        styles: { textAlign: "center" },
        content: { textAlign: "right" },
      }),
    ).toBe("center");
    expect(readCanvasChromeAlign({ content: { textAlign: "right" } })).toBe(
      "right",
    );
  });

  it("defaults to left when nothing is set", () => {
    expect(readCanvasChromeAlign({})).toBe("left");
    expect(readCanvasChromeAlign({ content: { textAlign: "justify" } })).toBe(
      "left",
    );
  });
});

describe("defaultCanvasChromeMode", () => {
  it("spans header and layout blocks, hugs the rest", () => {
    expect(defaultCanvasChromeMode("core/header")).toBe("span");
    expect(defaultCanvasChromeMode("core/page-shell")).toBe("span");
    expect(defaultCanvasChromeMode("core/group")).toBe("span");
    expect(defaultCanvasChromeMode("core/paragraph")).toBe("hug");
  });
});

describe("canvas chrome styles", () => {
  it("hugs with a full slot so the frame can sit center or right", () => {
    expect(getCanvasChromeSlotStyle({ mode: "hug", align: "center" })).toEqual({
      width: "100%",
      minWidth: 0,
      textAlign: "center",
    });
    expect(getCanvasChromeFrameStyle({ mode: "hug" })).toMatchObject({
      display: "inline-block",
      width: "fit-content",
      maxWidth: "100%",
    });
  });

  it("spans the slot at 100%", () => {
    expect(getCanvasChromeSlotStyle({ mode: "span", align: "center" })).toEqual({
      width: "100%",
      minWidth: 0,
    });
    expect(getCanvasChromeFrameStyle({ mode: "span" })).toMatchObject({
      width: "100%",
      display: "block",
    });
  });

  it("keeps an author width and only drops the 100% fallback when hugging", () => {
    expect(
      getCanvasChromeInnerStyle({
        mode: "hug",
        explicitWidth: "80%",
        isPreview: false,
      }),
    ).toEqual({ width: "80%", maxWidth: "100%" });
    expect(
      getCanvasChromeInnerStyle({
        mode: "hug",
        isPreview: false,
      }),
    ).toEqual({ width: "fit-content", maxWidth: "100%" });
    expect(
      getCanvasChromeInnerStyle({
        mode: "hug",
        isPreview: true,
      }),
    ).toEqual({ width: "100%" });
    expect(
      getCanvasChromeInnerStyle({
        mode: "span",
        isPreview: false,
      }),
    ).toEqual({ width: "100%" });
  });
});

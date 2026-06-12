import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import { resolveBlockDeviceStyles } from "@/components/PageBuilder/resolve-block-device-styles";

describe("resolve-block-device-styles", () => {
  const block: BlockConfig = {
    id: "b1",
    name: "core/heading",
    type: "block",
    parentId: null,
    content: { kind: "text", value: "Hi" },
    styles: { padding: "8px", fontSize: "24px" },
    other: {
      deviceStyles: {
        mobile: { padding: "4px" },
      },
    },
  };

  it("returns base styles on desktop", () => {
    expect(resolveBlockDeviceStyles({ block, device: "desktop" })).toEqual({
      padding: "8px",
      fontSize: "24px",
    });
  });

  it("merges mobile overrides on top of base", () => {
    expect(resolveBlockDeviceStyles({ block, device: "mobile" })).toEqual({
      padding: "4px",
      fontSize: "24px",
    });
  });
});

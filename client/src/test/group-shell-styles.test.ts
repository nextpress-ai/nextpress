import { describe, expect, it } from "vitest";
import { buildGroupShellStyles, mergeGroupDimensionStyles } from "@shared/group-shell-styles";

describe("mergeGroupDimensionStyles", () => {
	it("prefers styles over legacy content dimensions", () => {
		const merged = mergeGroupDimensionStyles(
			{ width: "640px", minHeight: "20rem" },
			{ width: "100%", minHeight: "10rem", maxWidth: "960px" },
		);
		expect(merged.width).toBe("640px");
		expect(merged.minHeight).toBe("20rem");
		expect(merged.maxWidth).toBe("960px");
	});
});

describe("buildGroupShellStyles", () => {
	it("applies column flex stack on inner container for vertical group preset", () => {
		const { innerStackStyle, stackDirection, isHorizontal } = buildGroupShellStyles({
			styles: { padding: "1rem" },
			content: {
				display: "flex",
				flexDirection: "column",
				gap: "16px",
				minHeight: "100dvh",
			},
			children: [],
		});
		expect(stackDirection).toBe("column");
		expect(isHorizontal).toBe(false);
		expect(innerStackStyle.display).toBe("flex");
		expect(innerStackStyle.flexDirection).toBe("column");
		expect(innerStackStyle.gap).toBe("16px");
	});
});

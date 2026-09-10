import { describe, expect, it } from "vitest";
import { getHorizontalFlexChildStyles } from "@shared/container-child-flex";

describe("getHorizontalFlexChildStyles", () => {
	it("does not force grow when the parent is a column", () => {
		expect(
			getHorizontalFlexChildStyles({
				isHorizontal: false,
				childStyles: { width: "100%" },
			}).flexGrow,
		).toBeUndefined();
	});

	it("keeps unset and 100% width as Fill so old rows do not collapse", () => {
		for (const width of [undefined, "100%"]) {
			const style = getHorizontalFlexChildStyles({
				isHorizontal: true,
				childStyles: width ? { width } : {},
			});
			expect(style.flexGrow).toBe("1");
			expect(style.flexShrink).toBe("1");
			expect(style.flexBasis).toBe("auto");
		}
	});

	it("Hugs fit-content and auto widths", () => {
		for (const width of ["fit-content", "auto", "max-content"]) {
			const style = getHorizontalFlexChildStyles({
				isHorizontal: true,
				childStyles: { width },
			});
			expect(style.flexGrow).toBe("0");
			expect(style.flexShrink).toBe("0");
			expect(style.flexBasis).toBe("auto");
			expect(style.width).toBe("fit-content");
		}
	});

	it("locks Fixed pixel widths", () => {
		const style = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "320px" },
		});
		expect(style.flexGrow).toBe("0");
		expect(style.flexBasis).toBe("320px");
		expect(style.width).toBe("320px");
	});

	it("keeps percent widths other than 100% as Fill so old 50/50 rows still share space", () => {
		const style = getHorizontalFlexChildStyles({
			isHorizontal: true,
			childStyles: { width: "50%" },
		});
		expect(style.flexGrow).toBe("1");
		expect(style.flexBasis).toBe("auto");
	});
});

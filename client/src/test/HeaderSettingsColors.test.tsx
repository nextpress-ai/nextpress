import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderSettings } from "@/components/PageBuilder/blocks/header/header-settings";
import { DEFAULT_HEADER_CONTENT } from "@shared/header-model";
import type { BlockConfig } from "@shared/schema-types";

vi.mock("@/components/media/MediaPickerDialog", () => ({ default: () => null }));

const headerBlock = (): BlockConfig => ({
	id: "hdr-1",
	name: "core/header",
	type: "container",
	label: "Header",
	category: "layout",
	content: { kind: "structured", data: { ...DEFAULT_HEADER_CONTENT } },
	settings: {},
	parentId: null,
});

describe("header Colors", () => {
	it("offers Color, Gradient and Image on the bar", () => {
		render(<HeaderSettings block={headerBlock()} onUpdate={() => undefined} />);
		expect(screen.getByRole("button", { name: /^Colors/ })).toHaveAttribute("aria-expanded", "true");
		const types = within(screen.getByRole("radiogroup", { name: "Background fill type" }));
		expect(types.getByRole("radio", { name: "Color" })).toBeInTheDocument();
		expect(types.getByRole("radio", { name: "Gradient" })).toBeInTheDocument();
		expect(types.getByRole("radio", { name: "Image" })).toBeInTheDocument();
	});
});

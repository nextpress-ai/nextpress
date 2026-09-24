import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DuplicatePageDialog, copyPageTitle } from "@/components/Pages/DuplicatePageDialog";

const apiRequest = vi.fn();
const setLocation = vi.fn();

vi.mock("@/lib/queryClient", () => ({
	apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock("wouter", () => ({
	useLocation: () => ["/", setLocation],
}));

vi.mock("@/lib/sonner-toast", () => ({
	showSuccessToast: vi.fn(),
	showErrorToast: vi.fn(),
}));

function renderDialog() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<DuplicatePageDialog
				page={{ id: "page-1", title: "Home" }}
				open={true}
				onOpenChange={() => undefined}
			/>
		</QueryClientProvider>,
	);
}

describe("DuplicatePageDialog", () => {
	beforeEach(() => {
		apiRequest.mockReset();
		setLocation.mockReset();
	});

	it("suggests Copy of the page name", () => {
		expect(copyPageTitle("Home")).toBe("Copy of Home");
		renderDialog();
		expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue("Copy of Home");
	});

	it("sends the typed name to the duplicate route", async () => {
		const user = userEvent.setup();
		apiRequest.mockResolvedValue({
			json: async () => ({ id: "page-2", title: "Walkable copy" }),
		});
		renderDialog();
		const name = screen.getByRole("textbox", { name: /name/i });
		await user.clear(name);
		await user.type(name, "Walkable copy");
		await user.click(screen.getByRole("button", { name: "Duplicate" }));
		await waitFor(() => {
			expect(apiRequest).toHaveBeenCalledWith("POST", "/api/pages/page-1/duplicate", {
				title: "Walkable copy",
			});
		});
	});
});

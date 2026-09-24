import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Plugins from "@/pages/Plugins";
import type { Plugin } from "@shared/schema-types";

const apiRequest = vi.fn();

vi.mock("@/lib/queryClient", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/queryClient")>();
	return {
		...actual,
		apiRequest: (...args: unknown[]) => apiRequest(...args),
	};
});

vi.mock("@/lib/sonner-toast", () => ({
	showSuccessToast: vi.fn(),
	showErrorToast: vi.fn(),
	resolvePluginError: () => "Could not update plugins. Please try again.",
}));

vi.mock("@/components/AdminLayout", () => ({
	AdminLayout: ({
		children,
		title,
		actions,
	}: {
		children: ReactNode;
		title: string;
		actions?: ReactNode;
	}) => (
		<div>
			<h1>{title}</h1>
			{actions}
			{children}
		</div>
	),
}));

const samplePlugin: Plugin = {
	id: "11111111-1111-4111-8111-111111111111",
	name: "Search extra",
	description: "Adds search",
	runsWhen: "rendering",
	authorId: "22222222-2222-4222-8222-222222222222",
	status: "inactive",
	version: "1.0.0",
	requires: "1.0.0",
	isPaid: false,
	price: 0,
	currency: "USD",
	settings: {},
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
	other: {},
};

function renderPage(plugins: Plugin[] = []) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, queryFn: async () => plugins },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={client}>
			<Plugins />
		</QueryClientProvider>,
	);
}

describe("Plugins page", () => {
	beforeEach(() => {
		apiRequest.mockReset();
	});

	it("shows an empty state with a way to add a plugin", async () => {
		renderPage([]);
		expect(await screen.findByText("No plugins yet.")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Add plugin" }).length).toBeGreaterThan(0);
	});

	it("lists a plugin and turns it on", async () => {
		const user = userEvent.setup();
		apiRequest.mockResolvedValue({
			json: async () => ({ ...samplePlugin, status: "active" }),
		});
		renderPage([samplePlugin]);
		expect(await screen.findByText("Search extra")).toBeInTheDocument();
		expect(screen.getByText("On published pages")).toBeInTheDocument();
		await user.click(screen.getByRole("switch", { name: "Turn Search extra on" }));
		await waitFor(() => {
			expect(apiRequest).toHaveBeenCalledWith(
				"POST",
				"/api/plugins/11111111-1111-4111-8111-111111111111/activate",
			);
		});
	});

	it("sends the typed name when adding a plugin", async () => {
		const user = userEvent.setup();
		apiRequest.mockResolvedValue({
			json: async () => ({ ...samplePlugin, name: "Forms" }),
		});
		renderPage([]);
		await user.click(screen.getAllByRole("button", { name: "Add plugin" })[0]!);
		const dialog = await screen.findByRole("dialog");
		const name = within(dialog).getByRole("textbox", { name: /name/i });
		await user.type(name, "Forms");
		await user.click(within(dialog).getByRole("button", { name: "Add plugin" }));
		await waitFor(() => {
			expect(apiRequest).toHaveBeenCalledWith("POST", "/api/plugins", {
				name: "Forms",
				description: undefined,
				version: "1.0.0",
				runsWhen: "rendering",
			});
		});
	});
});

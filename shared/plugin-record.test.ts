import { describe, expect, it } from "vitest";
import {
	createPluginInputSchema,
	describePluginRunsWhen,
	pluginNameTaken,
} from "./plugin-record";

describe("plugin-record", () => {
	it("requires a name on create", () => {
		expect(createPluginInputSchema.safeParse({ name: "" }).success).toBe(false);
		expect(createPluginInputSchema.safeParse({ name: "Search extra" }).success).toBe(true);
	});

	it("treats the same name in different case as taken", () => {
		expect(
			pluginNameTaken({ name: " Search Extra ", existing: ["search extra"] }),
		).toBe(true);
		expect(pluginNameTaken({ name: "Forms", existing: ["Search extra"] })).toBe(false);
	});

	it("names where a plugin runs in plain words", () => {
		expect(describePluginRunsWhen("rendering")).toBe("On published pages");
		expect(describePluginRunsWhen("admin")).toBe("In the admin");
		expect(describePluginRunsWhen("always")).toBe("Everywhere");
	});
});

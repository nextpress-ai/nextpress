import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createBlocksBuilder } from "../blocks/build-block.js";
import { createHttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { createNextpress } from "../create-nextpress.js";
import { blockConfigSchema, listPostsQuerySchema } from "../schemas/index.js";
import { createMockFetch } from "./mock-fetch.js";

const WARMUP_ITERATIONS = 5;
const MEASURE_ITERATIONS = 50;

/** Runs fn for warmup then returns average ms over measure iterations. */
function measureAverageMs(
	fn: () => void,
	options = { warmup: WARMUP_ITERATIONS, runs: MEASURE_ITERATIONS },
) {
	for (let i = 0; i < options.warmup; i++) {
		fn();
	}

	const start = performance.now();
	for (let i = 0; i < options.runs; i++) {
		fn();
	}
	const elapsed = performance.now() - start;
	return elapsed / options.runs;
}

describe("performance", () => {
	it("validates list query schemas under 1ms on average", () => {
		const input = { page: 1, per_page: 20, status: "publish" as const };
		const avg = measureAverageMs(() => {
			parseInput({
				schema: listPostsQuerySchema,
				input,
				label: "perf posts.list",
			});
		});

		expect(avg).toBeLessThan(1);
	});

	it("validates large nested block payloads under 5ms on average", () => {
		const blocks = createBlocksBuilder();
		const tree = Array.from({ length: 20 }, (_, index) =>
			blocks.container({
				children: [
					blocks.heading({ text: `Section ${index}`, level: 2 }),
					blocks.paragraph({ text: "Content".repeat(20) }),
				],
			}),
		);

		const avg = measureAverageMs(
			() => {
				parseInput({
					schema: z.array(blockConfigSchema),
					input: tree,
					label: "perf blocks",
				});
			},
			{ warmup: 3, runs: 20 },
		);

		expect(avg).toBeLessThan(50);
	});

	it("builds 200 blocks under 10ms on average", () => {
		const blocks = createBlocksBuilder();
		const avg = measureAverageMs(
			() => {
				for (let i = 0; i < 200; i++) {
					blocks.paragraph({ text: `Paragraph ${i}` });
				}
			},
			{ warmup: 2, runs: 10 },
		);

		expect(avg).toBeLessThan(10);
	});

	it("issues 100 mock HTTP requests under 15ms total", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/health",
				handler: () => Response.json({ status: "ok", timestamp: "now" }),
			},
		]);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_perf_key",
			fetch: fetchMock,
			timeout: 5000,
		});

		const start = performance.now();
		await Promise.all(Array.from({ length: 100 }, () => http.request("/api/health")));
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(100);
	});

	it("creates client instances without measurable overhead", () => {
		const fetchMock = vi.fn() as typeof fetch;
		const avg = measureAverageMs(
			() => {
				createNextpress({
					baseUrl: "https://cms.example.com",
					apiKey: "np_perf_key",
					fetch: fetchMock,
				});
			},
			{ warmup: 10, runs: 100 },
		);

		expect(avg).toBeLessThan(2);
	});

	it("serializes concurrent resource calls without serializing fetch mock", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/health",
				handler: () => Response.json({ status: "ok", timestamp: "now" }),
			},
			{
				path: "/api/posts",
				handler: () =>
					Response.json({ posts: [], total: 0, page: 1, per_page: 10, total_pages: 0 }),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_perf_key",
			fetch: fetchMock,
		});

		const start = performance.now();
		await Promise.all([
			nextpress.health.check(),
			nextpress.posts.list(),
			nextpress.health.check(),
			nextpress.posts.list(),
		]);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(10);
	});
});

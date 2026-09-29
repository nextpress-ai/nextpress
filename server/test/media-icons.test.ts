import { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import multer from "multer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../routes/shared/deps";

// The server checks a download address with a DNS lookup; the test must not touch the network.
vi.mock("../utils/validate-external-url", () => ({
	validateExternalUrl: async (input: string) => ({ ok: true, url: new URL(input) }),
}));

const { createMediaRoutes } = await import("../routes/media.routes");

const SITE = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Test" };
const USER_ID = "user-1";

type MediaRow = Record<string, string | number> & { id: string; originalName: string; siteId: string };

const HOSTILE_LOGO =
	'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="steal()"><script>steal()</script><path d="M0 0h1v1z"/></svg>';

let uploadDir = "";
let server: Server | null = null;
let rows: MediaRow[] = [];
let svglDownloads = 0;
const realFetch = globalThis.fetch;

const buildApp = () => {
	const upload = multer({
		storage: multer.diskStorage({
			destination: (_req, _file, cb) => cb(null, uploadDir),
			filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
		}),
		fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
	});

	const deps = {
		models: {
			sites: { findDefaultSite: async () => SITE },
			media: {
				findManyWhere: async (filters: Array<{ where: string; equals: string }>) =>
					rows.filter((row) => filters.every((f) => String(row[f.where]) === f.equals)),
				create: async (data: Omit<MediaRow, "id">) => {
					const row = { ...data, id: `media-${rows.length + 1}` } as MediaRow;
					rows.push(row);
					return row;
				},
			},
		},
		hooks: { doAction: () => undefined },
		requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
		authService: { getCurrentUserId: () => USER_ID },
		schemas: { media: { insert: { parse: (value: object) => value } } },
		upload,
		uploadDir,
		parsePaginationParams: () => ({ page: 1, perPage: 20 }),
		CONFIG: {},
	} as unknown as Deps;

	const app = express();
	app.use(express.json());
	app.use("/api/media", createMediaRoutes(deps));
	return app;
};

const start = async (): Promise<string> => {
	server = createServer(buildApp());
	await new Promise<void>((resolve) => server?.listen(0, resolve));
	const { port } = server.address() as AddressInfo;
	return `http://127.0.0.1:${port}`;
};

beforeEach(async () => {
	uploadDir = await mkdtemp(path.join(os.tmpdir(), "np-media-icons-"));
	rows = [];
	svglDownloads = 0;
	vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		if (url.startsWith("https://svgl.app/")) {
			svglDownloads += 1;
			return new Response(HOSTILE_LOGO, { headers: { "content-type": "image/svg+xml" } });
		}
		return realFetch(input, init);
	});
});

afterEach(async () => {
	vi.unstubAllGlobals();
	await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
	server = null;
	await rm(uploadDir, { recursive: true, force: true });
});

describe("POST /api/media/svgl", () => {
	it("saves one cleaned copy of the logo and reuses it the next time", async () => {
		const base = await start();
		const body = JSON.stringify({ url: "https://svgl.app/library/cursor_light.svg", title: "Cursor" });
		const headers = { "Content-Type": "application/json" };

		const first = await fetch(`${base}/api/media/svgl`, { method: "POST", headers, body });
		expect(first.status).toBe(201);
		const item = (await first.json()) as MediaRow;
		expect(item.originalName).toBe("svgl-cursor_light.svg");
		expect(item.alt).toBe("Cursor");

		const saved = await readFile(path.join(uploadDir, String(item.filename)), "utf8");
		expect(saved).not.toMatch(/script|onload|<\?xml/);
		expect(saved).toContain('<path d="M0 0h1v1z"/>');

		const again = await fetch(`${base}/api/media/svgl`, { method: "POST", headers, body });
		expect(again.status).toBe(200);
		expect(((await again.json()) as MediaRow).id).toBe(item.id);
		expect(svglDownloads).toBe(1);
	});

	it("refuses anything that is not a svgl.app logo file, without fetching it", async () => {
		const base = await start();
		const res = await fetch(`${base}/api/media/svgl`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data", title: "x" }),
		});
		expect(res.status).toBe(400);
		expect(((await res.json()) as { message: string }).message).toMatch(/Pick it again/);
		expect(svglDownloads).toBe(0);
		expect(rows).toHaveLength(0);
	});
});

describe("POST /api/media with an SVG", () => {
	it("stores the SVG without scripts or event handlers", async () => {
		const base = await start();
		const form = new FormData();
		form.append("file", new Blob([HOSTILE_LOGO], { type: "image/svg+xml" }), "mark.svg");
		const res = await fetch(`${base}/api/media`, { method: "POST", body: form });
		expect(res.status).toBe(201);
		const item = (await res.json()) as MediaRow;
		const saved = await readFile(path.join(uploadDir, String(item.filename)), "utf8");
		expect(saved).not.toMatch(/script|onload/);
		expect(item.size).toBe(Buffer.byteLength(saved, "utf8"));
	});

	it("refuses an SVG it cannot make safe and leaves no file behind", async () => {
		const base = await start();
		const form = new FormData();
		form.append(
			"file",
			new Blob(['<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>'], { type: "image/svg+xml" }),
			"trick.svg",
		);
		const res = await fetch(`${base}/api/media`, { method: "POST", body: form });
		expect(res.status).toBe(400);
		expect(((await res.json()) as { message: string }).message).toMatch(/Export it again/);
		expect(await readdir(uploadDir)).toHaveLength(0);
		expect(rows).toHaveLength(0);
	});
});

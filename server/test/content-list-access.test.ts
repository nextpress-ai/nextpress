import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../routes/shared/deps";
import {
	ContentAccessError,
	resolveNonPublicListSiteId,
} from "../lib/content-access";
import {
	attachRequestAuth,
	getRequestAuthSiteId,
	resolveRequestAuth,
} from "../auth";

vi.mock("../auth", () => ({
	attachRequestAuth: vi.fn(),
	getRequestAuthSiteId: vi.fn(),
	getRequestAuthUserId: vi.fn(),
	resolveRequestAuth: vi.fn(),
}));

const USER_ID = "user-1";
const SITE_ID = "site-1";
const OTHER_SITE_ID = "site-2";

const findByOwner = vi.fn();
const findById = vi.fn();
const findDefaultSite = vi.fn();
const findByUser = vi.fn();
const models = {
	sites: { findByOwner, findById, findDefaultSite },
	userRoles: { findByUser },
} as Deps["models"];

const request = {} as Request;
const sessionAuth = {
	userId: USER_ID,
	method: "session" as const,
	scopes: [],
};

describe("non-public content list access", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findByOwner.mockResolvedValue([
			{
				id: SITE_ID,
				name: "Site One",
				siteUrl: null,
				isDefault: true,
			},
		]);
		findByUser.mockResolvedValue([]);
		findById.mockResolvedValue(undefined);
		findDefaultSite.mockResolvedValue(undefined);
		vi.mocked(getRequestAuthSiteId).mockReturnValue(undefined);
	});

	it("allows session content only for an accessible requested site", async () => {
		vi.mocked(resolveRequestAuth).mockResolvedValue(sessionAuth);

		await expect(
			resolveNonPublicListSiteId({
				req: request,
				models,
				requestedSiteId: SITE_ID,
			}),
		).resolves.toBe(SITE_ID);

		expect(vi.mocked(attachRequestAuth)).toHaveBeenCalledWith(request, sessionAuth);
	});

	it("rejects an unauthorized requested site before list queries run", async () => {
		vi.mocked(resolveRequestAuth).mockResolvedValue(sessionAuth);

		const result = resolveNonPublicListSiteId({
			req: request,
			models,
			requestedSiteId: OTHER_SITE_ID,
		});

		await expect(result).rejects.toMatchObject({
			statusCode: 403,
		});
		expect(findByOwner).toHaveBeenCalledWith(USER_ID);
	});

	it("rejects unscoped session lists instead of falling back to a site", async () => {
		vi.mocked(resolveRequestAuth).mockResolvedValue(sessionAuth);

		await expect(
			resolveNonPublicListSiteId({
				req: request,
				models,
			}),
		).rejects.toMatchObject({
			statusCode: 400,
		});
		expect(findByOwner).not.toHaveBeenCalled();
	});

	it("uses bound API-key site when query scope is omitted", async () => {
		const apiKeyAuth = {
			userId: USER_ID,
			siteId: SITE_ID,
			method: "apiKey" as const,
			scopes: ["pages:read"],
		};
		vi.mocked(resolveRequestAuth).mockResolvedValue(apiKeyAuth);
		vi.mocked(getRequestAuthSiteId).mockReturnValue(SITE_ID);

		await expect(
			resolveNonPublicListSiteId({
				req: request,
				models,
			}),
		).resolves.toBe(SITE_ID);
	});

	it("rejects a cross-site request made with a bound API key", async () => {
		const apiKeyAuth = {
			userId: USER_ID,
			siteId: SITE_ID,
			method: "apiKey" as const,
			scopes: ["posts:read"],
		};
		vi.mocked(resolveRequestAuth).mockResolvedValue(apiKeyAuth);
		vi.mocked(getRequestAuthSiteId).mockReturnValue(SITE_ID);

		await expect(
			resolveNonPublicListSiteId({
				req: request,
				models,
				requestedSiteId: OTHER_SITE_ID,
			}),
		).rejects.toBeInstanceOf(ContentAccessError);
	});

	it("rejects unauthenticated non-public list requests", async () => {
		vi.mocked(resolveRequestAuth).mockResolvedValue(null);

		await expect(
			resolveNonPublicListSiteId({
				req: request,
				models,
				requestedSiteId: SITE_ID,
			}),
		).rejects.toMatchObject({
			statusCode: 401,
		});
	});
});

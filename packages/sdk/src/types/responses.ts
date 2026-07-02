import type { ReleaseHighlight } from "./release.js";
import type { UpgradeAssessment } from "./upgrade.js";
import type {
	ImportBatchResult,
	WpDiscoverResult,
	WpImportStatusResponse,
	WpListResult,
} from "./wordpress-import.js";

export type SystemReleaseResponse = {
	installedVersion: string;
	latestVersion: string;
	updateAvailable: boolean;
	updateCheck: {
		source: string;
		ok: boolean;
		note?: string;
		checkedAt: string;
	};
	releaseDate: string;
	highlights: ReleaseHighlight[];
	supportedUpgradeFrom: readonly string[];
};

export type SystemUpgradeCheckResponse = UpgradeAssessment;

export type SystemUpgradeRunResponse = {
	message: string;
	output?: string;
	assessment: UpgradeAssessment;
};

export type SetupResponse = {
	success: boolean;
	message: string;
	redirect: string;
	loginUrl?: string;
	caddySuccess?: boolean;
	caddyStatus?: string;
};

export type VerifyDomainResponse =
	| { status: false; message: string }
	| {
			status: true;
			data: {
				domain: string;
				dnsOk: boolean;
				ipMatch?: boolean;
				caddyOk?: boolean;
				message?: string;
			};
	  };

export type HooksResponse = {
	actions: Record<string, unknown>;
	filters: Record<string, unknown>;
};

export type SignInResponse = {
	redirect: boolean;
	token: string;
	user: {
		id: string;
		email: string;
		name?: string;
		username?: string;
	};
};

export type SignUpInput = {
	email: string;
	password: string;
	name: string;
	username?: string;
	firstName?: string;
	lastName?: string;
};

export type SignUpResponse = SignInResponse;

export type { ImportBatchResult, WpDiscoverResult, WpImportStatusResponse, WpListResult };

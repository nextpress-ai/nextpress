export type UpgradeAssessment = {
	updateAvailable: boolean;
	installedVersion: string;
	latestVersion: string;
	mode: "auto" | "manual";
	canAutoUpgrade: boolean;
	schema: {
		installed: string | null;
		target: string;
		previousRequired: string;
		compatible: boolean;
		hasSchemaChanges: boolean;
	};
	blockers: string[];
	instructions: string[];
	command: string;
};

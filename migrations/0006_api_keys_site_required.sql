-- Every API key must belong to one site. Legacy keys without a site are revoked.
UPDATE "api_keys"
SET "site_id" = (
	SELECT "id" FROM "sites" WHERE "is_default" = true LIMIT 1
)
WHERE "site_id" IS NULL
	AND "revoked_at" IS NULL;
--> statement-breakpoint
UPDATE "api_keys"
SET "revoked_at" = NOW()
WHERE "site_id" IS NULL
	AND "revoked_at" IS NULL;
--> statement-breakpoint
UPDATE "api_keys"
SET "site_id" = (SELECT "id" FROM "sites" LIMIT 1)
WHERE "site_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "site_id" SET NOT NULL;

-- Multi-site: blogs/media/options gain a site_id. Backfill orphaned rows to the
-- primary/default site before enforcing NOT NULL so upgrades from pre-multi-site
-- installs succeed. All statements are idempotent so a partially-applied run can
-- be retried safely.
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar NOT NULL,
	"value" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_slug_unique";--> statement-breakpoint
UPDATE "blogs" SET "site_id" = (SELECT "id" FROM "sites" WHERE "is_default" = true LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
UPDATE "blogs" SET "site_id" = (SELECT "id" FROM "sites" LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
ALTER TABLE "blogs" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "site_id" uuid;--> statement-breakpoint
UPDATE "media" SET "site_id" = (SELECT "id" FROM "sites" WHERE "is_default" = true LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
UPDATE "media" SET "site_id" = (SELECT "id" FROM "sites" LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN IF NOT EXISTS "site_id" uuid;--> statement-breakpoint
UPDATE "options" SET "site_id" = (SELECT "id" FROM "sites" WHERE "is_default" = true LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
UPDATE "options" SET "site_id" = (SELECT "id" FROM "sites" LIMIT 1) WHERE "site_id" IS NULL;--> statement-breakpoint
ALTER TABLE "options" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_username" varchar;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_site_slug_unique" ON "blogs" USING btree ("site_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "options_site_name_unique" ON "options" USING btree ("site_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_slug_unique" ON "pages" USING btree ("site_id","slug");

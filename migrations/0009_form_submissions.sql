CREATE TABLE IF NOT EXISTS "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"page_id" uuid,
	"form_name" varchar NOT NULL,
	"fields" jsonb NOT NULL,
	"status" varchar DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "form_submissions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "form_submissions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_site_created_idx" ON "form_submissions" USING btree ("site_id","created_at");

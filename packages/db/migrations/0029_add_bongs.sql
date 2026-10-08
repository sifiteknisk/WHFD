ALTER TABLE "users" ADD COLUMN "bongs_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bongs_available" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "bongs_available_in_range" CHECK (bongs_available >= 0 AND bongs_available <= bongs_total);
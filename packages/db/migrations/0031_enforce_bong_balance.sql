ALTER TABLE "users" DROP CONSTRAINT "bongs_available_in_range";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bongs_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- bongs_total used to be the points-earned high-water mark, with manual grants
-- only raising bongs_available. Keep the mark in bongs_earned and make
-- bongs_total cover manual grants too (at least as many as are still unspent).
UPDATE "users" SET "bongs_earned" = "bongs_total", "bongs_total" = GREATEST("bongs_total", "bongs_available");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "bongs_available_in_range" CHECK (bongs_available >= 0 AND bongs_available <= bongs_total AND bongs_earned >= 0 AND bongs_earned <= bongs_total);

ALTER TABLE "users" DROP CONSTRAINT "bongs_available_in_range";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "bongs_available_in_range" CHECK (bongs_available >= 0 AND bongs_total >= 0);
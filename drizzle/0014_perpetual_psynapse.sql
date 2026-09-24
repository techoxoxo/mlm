ALTER TABLE "users" ADD COLUMN "frozen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "frozen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "frozen_reason" text;
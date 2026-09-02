ALTER TYPE "public"."tx_type" ADD VALUE 'roi_investment';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'roi_direct_income';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'roi_daily_payout';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'roi_level_income';--> statement-breakpoint
CREATE TABLE "roi_investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_level_tiers" (
	"level" integer PRIMARY KEY NOT NULL,
	"percent" numeric(5, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_invest" integer DEFAULT 100 NOT NULL,
	"max_invest" integer DEFAULT 2000 NOT NULL,
	"invest_step" integer DEFAULT 100 NOT NULL,
	"base_daily_roi_percent" numeric(5, 3) DEFAULT '0.300' NOT NULL,
	"boosted_daily_roi_percent" numeric(5, 3) DEFAULT '0.500' NOT NULL,
	"direct_income_percent" integer DEFAULT 10 NOT NULL,
	"boost_threshold_usdt" integer DEFAULT 2500 NOT NULL,
	"cap_multiplier" integer DEFAULT 3 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- support_messages / support_tickets already exist (created via drizzle-kit
-- push on an earlier branch, never captured in a migration) — only backfilling
-- their missing indexes below, not recreating the tables.
ALTER TABLE "users" ADD COLUMN "roi_invested" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_earned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_direct_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_boosted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_boosted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "roi_investments_user_idx" ON "roi_investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_msg_ticket_idx" ON "support_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_ticket_user_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_ticket_status_idx" ON "support_tickets" USING btree ("status");
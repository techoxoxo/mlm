ALTER TYPE "public"."tx_type" ADD VALUE 'id_pin_fee' BEFORE 'activation_fee';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'royalty_fee' BEFORE 'activation_fee';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'royalty_payout' BEFORE 'adjustment';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'royalty_reserve_reward' BEFORE 'adjustment';--> statement-breakpoint
CREATE TABLE "pools" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"royalty_pool" integer DEFAULT 0 NOT NULL,
	"royalty_reserve" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "royalty_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"directs" integer,
	"band_percent" integer,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "royalty_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_before" integer NOT NULL,
	"reserve_added" integer NOT NULL,
	"rank_distributed" integer NOT NULL,
	"reserve_distributed" integer NOT NULL,
	"rank_recipients" integer NOT NULL,
	"reserve_recipients" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "royalty_tiers" (
	"min_directs" integer PRIMARY KEY NOT NULL,
	"percent" integer NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "id_pin_fee" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "royalty_fee" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "royalty_reserve_percent" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "reserve_inactivity_months" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_stage_cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_reserve_reward_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "royalty_payouts_run_idx" ON "royalty_payouts" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "royalty_payouts_user_idx" ON "royalty_payouts" USING btree ("user_id");
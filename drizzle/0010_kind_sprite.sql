CREATE TYPE "public"."roi_tx_type" AS ENUM('direct_income', 'daily_payout', 'level_income');--> statement-breakpoint
CREATE TABLE "roi_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "roi_tx_type" NOT NULL,
	"points" numeric(18, 6) NOT NULL,
	"counterparty_id" uuid,
	"investment_id" uuid,
	"level" integer,
	"note" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "roi_earned" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "roi_earned" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_wallet_credited" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "roi_transactions_user_idx" ON "roi_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "roi_tx_idem_idx" ON "roi_transactions" USING btree ("idempotency_key");
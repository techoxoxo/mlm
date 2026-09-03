ALTER TABLE "crypto_transactions" ADD COLUMN "source" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "roi_withdrawable_balance" integer DEFAULT 0 NOT NULL;
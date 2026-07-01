CREATE TYPE "public"."crypto_gateway" AS ENUM('razcrypto', 'nowpayments', 'oxapay', 'cryptomus');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_users" integer NOT NULL,
	"mismatch_count" integer NOT NULL,
	"mismatches" jsonb,
	"auto_fixed" boolean DEFAULT false NOT NULL,
	"triggered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "gateway" "crypto_gateway" DEFAULT 'razcrypto' NOT NULL;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "approved_by_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "rejected_by_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "crypto_transactions" ADD COLUMN "ip_address" text;--> statement-breakpoint
CREATE INDEX "audit_log_admin_idx" ON "audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");
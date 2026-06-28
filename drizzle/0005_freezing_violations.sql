CREATE TYPE "public"."crypto_tx_status" AS ENUM('pending', 'pending_admin_approval', 'processing', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."crypto_tx_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'usdt_deposit';--> statement-breakpoint
ALTER TYPE "public"."tx_type" ADD VALUE 'usdt_withdrawal';--> statement-breakpoint
CREATE TABLE "crypto_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "crypto_tx_type" NOT NULL,
	"status" "crypto_tx_status" DEFAULT 'pending' NOT NULL,
	"amount_usdt" numeric(18, 6) NOT NULL,
	"amount_points" integer NOT NULL,
	"fee_usdt" numeric(18, 6) DEFAULT '0.000000' NOT NULL,
	"network" text NOT NULL,
	"payment_id" text,
	"tx_hash" text,
	"encrypted_wallet_address" text,
	"hashed_wallet_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "crypto_tx_user_idx" ON "crypto_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_tx_payment_idx" ON "crypto_transactions" USING btree ("payment_id");
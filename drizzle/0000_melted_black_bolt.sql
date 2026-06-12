CREATE TYPE "public"."choice_status" AS ENUM('pending', 'exited', 'upgraded');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('open', 'filled');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('join_fee', 'activation_fee', 'upgrade_fee', 'slot_credit', 'referral_bonus', 'exit_payout', 'upgrade_take', 'company_fee', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('registered', 'active', 'exited', 'completed');--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"join_fee" integer DEFAULT 10 NOT NULL,
	"company_percent" integer DEFAULT 0 NOT NULL,
	"auto_place" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slab_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slab_level" integer NOT NULL,
	"collected" integer NOT NULL,
	"status" "choice_status" DEFAULT 'pending' NOT NULL,
	"payout" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "slabs" (
	"level" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fee" integer NOT NULL,
	"slots" integer NOT NULL,
	"referral_bonus" integer DEFAULT 0 NOT NULL,
	"exit_percent" integer DEFAULT 30 NOT NULL,
	"upgrade_take_percent" integer DEFAULT 25 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slab_level" integer NOT NULL,
	"position" integer NOT NULL,
	"status" "slot_status" DEFAULT 'open' NOT NULL,
	"occupant_id" uuid,
	"queue_seq" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"filled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "tx_type" NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"counterparty_id" uuid,
	"slab_level" integer,
	"note" text,
	"meta" jsonb,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'registered' NOT NULL,
	"sponsor_id" uuid,
	"referral_code" text NOT NULL,
	"current_slab" integer DEFAULT 0 NOT NULL,
	"pending_choice_slab" integer,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"exited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "completions_user_idx" ON "slab_completions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "completions_uniq_idx" ON "slab_completions" USING btree ("user_id","slab_level");--> statement-breakpoint
CREATE INDEX "slots_fifo_idx" ON "slots" USING btree ("slab_level","status","queue_seq");--> statement-breakpoint
CREATE INDEX "slots_owner_idx" ON "slots" USING btree ("owner_id","slab_level");--> statement-breakpoint
CREATE INDEX "tx_user_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tx_idem_idx" ON "transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "users_sponsor_idx" ON "users" USING btree ("sponsor_id");
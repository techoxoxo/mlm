CREATE TABLE "roi_distribution_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"triggered_by" text NOT NULL,
	"from_date_key" text,
	"to_date_key" text,
	"investments_processed" integer DEFAULT 0 NOT NULL,
	"days_processed" integer DEFAULT 0 NOT NULL,
	"daily_paid" numeric(18, 6) DEFAULT '0' NOT NULL,
	"level_paid" numeric(18, 6) DEFAULT '0' NOT NULL,
	"daily_recipients" integer DEFAULT 0 NOT NULL,
	"level_payouts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

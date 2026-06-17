ALTER TABLE "users" ADD COLUMN "serial_no" serial NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_serial_idx" ON "users" USING btree ("serial_no");
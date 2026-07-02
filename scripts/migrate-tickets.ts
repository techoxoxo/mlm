import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("=== RUNNING SUPPORT TICKETS MIGRATION ===");
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS support_ticket_user_idx ON support_tickets (user_id);
    CREATE INDEX IF NOT EXISTS support_ticket_status_idx ON support_tickets (status);
    CREATE INDEX IF NOT EXISTS support_msg_ticket_idx ON support_messages (ticket_id);
  `);

  console.log("Migration completed successfully!");
}

run().catch(console.error).finally(() => process.exit(0));

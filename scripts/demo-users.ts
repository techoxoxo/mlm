import "dotenv/config";
import { db, pool, schema } from "@/db";
import { activate, chargeRegistration } from "@/lib/distribution";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { memberCode } from "@/db/schema";

const { users } = schema;

// fixed demo accounts (password is the same for all, >= 8 chars)
const PASSWORD = "demo1234";
const PEOPLE = ["Alice", "Ravi", "Mei", "Diego", "Sara", "Tom", "Nina", "Omar"];

async function main() {
  const pw = await hashPassword(PASSWORD);
  const created: { email: string; name: string; id: string }[] = [];

  for (let i = 0; i < PEOPLE.length; i++) {
    const name = PEOPLE[i];
    const email = `${name.toLowerCase()}@apex.demo`;
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      created.push({ email, name, id: existing.id });
      continue;
    }
    // chain sponsors: each new user is referred by a random earlier one
    const sponsorId = created.length ? created[Math.floor(Math.random() * created.length)].id : null;
    const u = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({ name, email, passwordHash: pw, sponsorId, referralCode: genReferralCode(), status: "registered" })
        .returning();
      await chargeRegistration(tx, row.id);
      return row;
    });
    await activate(u.id); // enter Stage 1 (fills earlier users' slots via FIFO)
    created.push({ email, name, id: u.id });
  }

  // report
  const rows = await db
    .select({ serial: users.serialNo, name: users.name, email: users.email, slab: users.currentSlab, bal: users.pointsBalance, code: users.referralCode })
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(users.serialNo);

  console.log(`\n=== Demo logins (password for all: ${PASSWORD}) ===\n`);
  for (const r of rows.filter((r) => r.email.endsWith("@apex.demo"))) {
    console.log(`  ${memberCode(r.serial).padEnd(11)}  ${r.email.padEnd(22)}  stage ${r.slab}  bal ${String(r.bal).padStart(4)}  ref:${r.code}`);
  }
  console.log(`\nAdmin: admin@mlm.local / admin123\n`);

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

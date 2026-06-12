import "dotenv/config";
import { db, pool } from "./index";
import { settings, slabs, users } from "./schema";
import { hashPassword, genReferralCode } from "@/lib/auth";
import { eq } from "drizzle-orm";

const SLABS = [
  { level: 1, name: "Starter", fee: 30, slots: 2, referralBonus: 5, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 2, name: "Bronze", fee: 50, slots: 4, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 3, name: "Silver", fee: 150, slots: 8, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 4, name: "Gold", fee: 1000, slots: 16, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
  { level: 5, name: "Platinum", fee: 10000, slots: 32, referralBonus: 0, exitPercent: 30, upgradeTakePercent: 25 },
];

async function main() {
  console.log("Seeding settings…");
  await db
    .insert(settings)
    .values({ id: 1, joinFee: 10, companyPercent: 0, autoPlace: true })
    .onConflictDoNothing();

  console.log("Seeding slabs…");
  for (const s of SLABS) {
    await db
      .insert(slabs)
      .values({ ...s, sortOrder: s.level, active: true })
      .onConflictDoUpdate({
        target: slabs.level,
        set: { name: s.name, fee: s.fee, slots: s.slots, referralBonus: s.referralBonus },
      });
  }

  console.log("Seeding admin user…");
  const adminEmail = "admin@mlm.local";
  const existing = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existing) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await hashPassword("admin123"),
      name: "Administrator",
      role: "admin",
      status: "active",
      referralCode: genReferralCode(),
    });
    console.log("  → admin@mlm.local / admin123");
  } else {
    console.log("  → admin already exists");
  }

  console.log("Seed complete.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
